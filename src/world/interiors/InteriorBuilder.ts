/**
 * Builds one interior from its data in `src/config/interiors.ts`.
 *
 * The same contract as the campus world modules: data in; batched geometry,
 * colliders and interactables out. Nothing here knows about the player, the
 * story or the UI. The game builds an interior when the player walks in and
 * disposes it when they leave, so only one interior's geometry and lettering
 * ever exist at a time.
 *
 * An interior is drawn in about fifteen batches (one per material used), with
 * its own small sign atlas for door numbers and notices.
 */

import { Group, MeshLambertMaterial, Vector3, type Mesh } from 'three';

import { type DoorFacing, type InteriorDef, type WallDef } from '../../config/interiors';
import type { MaterialKey } from '../../config/palette';
import type { QualityPreset } from '../../config/settings';
import type { Collider, Interactable, Vec2Tuple } from '../../types';
import { GeometryBatcher, type BatchStats } from '../../utils/GeometryBatcher';
import type { MaterialLibrary } from '../../utils/MaterialLibrary';
import { ShapeBuilder, degToRad } from '../../utils/shapes';
import type { WorldBuildContext, WorldSink } from '../context';
import { SignAtlas } from '../SignAtlas';
import { buildProp, propLabels } from './furniture';
import type { FurnitureKit } from './furnitureKit';

const WALL_THICKNESS = 0.2;
/** Height of the painted lower band on every wall. */
const DADO_HEIGHT = 1.1;
const DOOR_HEIGHT = 2.1;
const DOOR_WIDTH = 0.95;
const WINDOW_SILL = 1;
const WINDOW_HEIGHT = 1.2;

const OUTWARD: Record<DoorFacing, Vec2Tuple> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};
const FACING_ROTATION: Record<DoorFacing, number> = { south: 0, north: 180, east: 90, west: -90 };

export interface BuiltInterior {
  readonly def: InteriorDef;
  readonly group: Group;
  readonly colliders: readonly Collider[];
  readonly interactables: readonly Interactable[];
  readonly stats: BatchStats;
  readonly signAtlas: SignAtlas;
}

/**
 * `kit` is the loaded furniture kit, or `null` to build every prop from boxes.
 * With a kit, its material must already be registered under `furnitureKit`.
 */
export function buildInterior(def: InteriorDef, quality: QualityPreset, materials: MaterialLibrary, kit: FurnitureKit | null): BuiltInterior {
  const batcher = new GeometryBatcher();
  const shapes = new ShapeBuilder(batcher);

  const signAtlas = new SignAtlas(collectLabels(def).map((text) => ({ text, style: 'board' as const })));
  materials.register('interiorSignText', new MeshLambertMaterial({ map: signAtlas.texture }));

  const colliders: Collider[] = [];
  const interactables: Interactable[] = [];
  const sink: WorldSink = {
    addBoxCollider(sourceId, centre, halfWidth, halfDepth, rotationYDegrees) {
      colliders.push({ kind: 'box', sourceId, x: centre[0], z: centre[1], halfWidth, halfDepth, rotationY: degToRad(rotationYDegrees) });
    },
    addCircleCollider(sourceId, centre, radius) {
      colliders.push({ kind: 'circle', sourceId, x: centre[0], z: centre[1], radius });
    },
    addInteractable(interactable) {
      interactables.push(interactable);
    },
  };
  const world: WorldBuildContext = { shapes, quality, sink, labels: signAtlas };
  const height = def.wallHeight;

  // Floors, then one ceiling slab over everything.
  for (const room of def.rooms) {
    const [x0, z0, x1, z1] = room.rect;
    shapes.ground(room.floor, [(x0 + x1) / 2, (z0 + z1) / 2], [x1 - x0, z1 - z0], 0.002);
  }
  const [bx0, bz0, bx1, bz1] = def.bounds;
  shapes.box('ceilingWhite', [(bx0 + bx1) / 2, height + 0.05, (bz0 + bz1) / 2], [bx1 - bx0 + 0.6, 0.1, bz1 - bz0 + 0.6]);
  for (const [x, z] of def.lights) {
    shapes.box('lampGlass', [x, height - 0.02, z], [0.7, 0.04, 0.7]);
  }

  def.walls.forEach((wall, index) => buildWall(world, wall, height, `${def.id}:wall-${index}`));
  buildDoors(world, def);
  buildDoorwayPlates(world, def);
  def.props.forEach((prop, index) => buildProp({ world, wallHeight: height, kit }, prop, index));

  for (const exit of def.exits) {
    sink.addInteractable({
      id: `exit:${def.id}:${exit.entrance}`,
      position: new Vector3(exit.at[0], 1.2, exit.at[1]),
      radius: exit.radius,
      promptLabel: exit.promptLabel,
      eyebrow: def.name,
      title: exit.promptLabel,
      body: [],
      action: { kind: 'exit', entrance: exit.entrance },
    });
  }

  // No sun indoors, so nothing casts or receives a shadow.
  const { meshes, stats } = batcher.build({
    materialFor: (key) => materials.get(key),
    castShadow: () => false,
    receiveShadow: () => false,
  });
  const group = new Group();
  group.name = `interior:${def.id}`;
  for (const mesh of meshes) {
    group.add(mesh);
  }
  return { def, group, colliders, interactables, stats, signAtlas };
}

/** Frees the interior's merged geometry and lettering. Materials are shared and stay. */
export function disposeInterior(interior: BuiltInterior): void {
  interior.group.removeFromParent();
  for (const child of interior.group.children) {
    (child as Mesh).geometry.dispose();
  }
  interior.group.clear();
  interior.signAtlas.dispose();
}

// ---------------------------------------------------------------------------
// Walls
// ---------------------------------------------------------------------------

/**
 * An axis-aligned wall, cut by doorways. Each solid run is a painted lower
 * band plus the wall above it, with a collider; doorways get a lintel; windows
 * are a lit pane in a green frame on both faces (they are not holes, so there
 * is nothing behind them to model).
 */
function buildWall(world: WorldBuildContext, wall: WallDef, height: number, id: string): void {
  const { shapes, sink } = world;
  const alongX = Math.abs(wall.from[1] - wall.to[1]) < 1e-6;
  if (!alongX && Math.abs(wall.from[0] - wall.to[0]) > 1e-6) {
    throw new Error(`Interior wall ${id} must be horizontal or vertical`);
  }
  const fixed = alongX ? wall.from[1] : wall.from[0];
  const start = Math.min(alongX ? wall.from[0] : wall.from[1], alongX ? wall.to[0] : wall.to[1]);
  const end = Math.max(alongX ? wall.from[0] : wall.from[1], alongX ? wall.to[0] : wall.to[1]);

  /** A box spanning `[a, b]` along the wall, between two heights. */
  const span = (material: MaterialKey, a: number, b: number, y0: number, y1: number, thickness = WALL_THICKNESS): void => {
    const mid = (a + b) / 2;
    const length = b - a;
    const centre: [number, number, number] = alongX ? [mid, (y0 + y1) / 2, fixed] : [fixed, (y0 + y1) / 2, mid];
    shapes.box(material, centre, alongX ? [length, y1 - y0, thickness] : [thickness, y1 - y0, length]);
  };

  const openings = [...(wall.openings ?? [])].sort((a, b) => a.at - b.at);
  let cursor = start;
  const solidRun = (a: number, b: number, part: number): void => {
    if (b - a < 0.01) {
      return;
    }
    span('wallDado', a, b, 0, DADO_HEIGHT);
    span('wallPaint', a, b, DADO_HEIGHT, height);
    const mid = (a + b) / 2;
    sink.addBoxCollider(
      `${id}:${part}`,
      alongX ? [mid, fixed] : [fixed, mid],
      alongX ? (b - a) / 2 : WALL_THICKNESS / 2,
      alongX ? WALL_THICKNESS / 2 : (b - a) / 2,
      0,
    );
  };
  openings.forEach((opening, part) => {
    const a = opening.at - opening.width / 2;
    const b = opening.at + opening.width / 2;
    solidRun(cursor, a, part);
    span('wallPaint', a, b, DOOR_HEIGHT + 0.1, height);
    span('trimGreen', a - 0.05, a + 0.02, 0, DOOR_HEIGHT + 0.1, WALL_THICKNESS + 0.04);
    span('trimGreen', b - 0.02, b + 0.05, 0, DOOR_HEIGHT + 0.1, WALL_THICKNESS + 0.04);
    span('trimGreen', a - 0.05, b + 0.05, DOOR_HEIGHT + 0.05, DOOR_HEIGHT + 0.12, WALL_THICKNESS + 0.04);
    cursor = b;
  });
  solidRun(cursor, end, openings.length);

  for (const window of wall.windows ?? []) {
    const a = window.at - window.width / 2;
    const b = window.at + window.width / 2;
    const top = WINDOW_SILL + WINDOW_HEIGHT;
    // Slightly thicker than the wall, so the pane shows on both faces.
    span('windowDaylight', a, b, WINDOW_SILL, top, WALL_THICKNESS + 0.03);
    span('trimGreen', a - 0.06, b + 0.06, WINDOW_SILL - 0.06, WINDOW_SILL, WALL_THICKNESS + 0.06);
    span('trimGreen', a - 0.06, b + 0.06, top, top + 0.06, WALL_THICKNESS + 0.06);
    span('trimGreen', a - 0.06, a, WINDOW_SILL, top, WALL_THICKNESS + 0.06);
    span('trimGreen', b, b + 0.06, WINDOW_SILL, top, WALL_THICKNESS + 0.06);
    span('trimGreen', window.at - 0.025, window.at + 0.025, WINDOW_SILL, top, WALL_THICKNESS + 0.05);
  }
}

// ---------------------------------------------------------------------------
// Doors
// ---------------------------------------------------------------------------

/** Closed doors: a leaf on the wall face, a number plate, and a knock. */
function buildDoors(world: WorldBuildContext, def: InteriorDef): void {
  const { shapes, sink, labels } = world;
  for (const door of def.doors) {
    const [ox, oz] = OUTWARD[door.facing];
    const rotation = FACING_ROTATION[door.facing];
    const face = WALL_THICKNESS / 2 + 0.03;
    const leafAt: Vec2Tuple = [door.at[0] + ox * face, door.at[1] + oz * face];
    const alongX = door.facing === 'north' || door.facing === 'south';
    shapes.box('doorWood', [leafAt[0], DOOR_HEIGHT / 2, leafAt[1]], alongX ? [DOOR_WIDTH, DOOR_HEIGHT, 0.05] : [0.05, DOOR_HEIGHT, DOOR_WIDTH]);
    shapes.box('trimGreen', [leafAt[0], DOOR_HEIGHT + 0.04, leafAt[1]], alongX ? [DOOR_WIDTH + 0.12, 0.08, 0.07] : [0.07, 0.08, DOOR_WIDTH + 0.12]);
    const handleX = leafAt[0] + (alongX ? 0.36 : ox * 0.04);
    const handleZ = leafAt[1] + (alongX ? oz * 0.04 : 0.36);
    shapes.box('metalPole', [handleX, 1, handleZ], [0.05, 0.05, 0.05]);

    const cell = labels.cell(door.label, 'board');
    const plateWidth = Math.min(0.62, 0.16 * cell.aspect);
    shapes.label('interiorSignText', [leafAt[0] + ox * 0.03, 1.72, leafAt[1] + oz * 0.03], plateWidth, plateWidth / cell.aspect, rotation, cell.uv);

    const isRoom = door.label.startsWith('A-');
    sink.addInteractable({
      id: `door:${def.id}:${door.label}`,
      position: new Vector3(door.at[0] + ox * 0.7, 1.4, door.at[1] + oz * 0.7),
      radius: 1.6,
      promptLabel: isRoom ? `Knock on ${door.label}` : 'Read the door',
      eyebrow: def.name,
      title: isRoom ? `Room ${door.label}` : door.label.charAt(0) + door.label.slice(1).toLowerCase(),
      body: door.knock,
    });
  }
}

/** A number plate over each open doorway, on the side the player arrives from. */
function buildDoorwayPlates(world: WorldBuildContext, def: InteriorDef): void {
  const { shapes, labels } = world;
  for (const room of def.rooms) {
    if (!room.door || !room.mapLabel || room.id === 'common') {
      continue;
    }
    const [x0, z0, x1, z1] = room.rect;
    const centre: Vec2Tuple = [(x0 + x1) / 2, (z0 + z1) / 2];
    const [dx, dz] = room.door;
    // Which wall the doorway is in decides which way "outside the room" is.
    const onHorizontal = Math.abs(dz - z0) < 1e-3 || Math.abs(dz - z1) < 1e-3;
    const outward: Vec2Tuple = onHorizontal ? [0, Math.sign(dz - centre[1])] : [Math.sign(dx - centre[0]), 0];
    const rotation = onHorizontal ? (outward[1] > 0 ? 0 : 180) : outward[0] > 0 ? 90 : -90;
    const cell = labels.cell(room.mapLabel, 'board');
    const width = 0.62;
    const offset = WALL_THICKNESS / 2 + 0.02;
    shapes.label(
      'interiorSignText',
      [dx + outward[0] * offset, DOOR_HEIGHT + 0.42, dz + outward[1] * offset],
      width,
      width / cell.aspect,
      rotation,
      cell.uv,
    );
  }
}

function collectLabels(def: InteriorDef): string[] {
  const labels = new Set<string>();
  for (const door of def.doors) {
    labels.add(door.label);
  }
  for (const room of def.rooms) {
    if (room.door && room.mapLabel && room.id !== 'common') {
      labels.add(room.mapLabel);
    }
  }
  for (const text of propLabels(def.props)) {
    labels.add(text);
  }
  // An atlas with no cells still needs one, to have a valid texture.
  if (labels.size === 0) {
    labels.add(def.name.toUpperCase());
  }
  return [...labels];
}
