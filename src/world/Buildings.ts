/**
 * Building generator.
 *
 * Reads `BUILDINGS` and `BRIDGES` from the campus layout and produces
 * placeholder geometry in the style of the elevation sheets in
 * `GAME_ART/buildings/`: cream render on a grey plinth, green-framed windows,
 * balconied corridors with green balustrades, external stair towers at the
 * ends, a canopy over the entrance, and red hipped roofs with wide eaves.
 *
 * Every building is a list of rectangular WINGS. An H-plan is three wings, a
 * courtyard hostel five, a lecture block one. Each wing generates its own
 * walls, windows, corridors, roof and collider, so the open courts of an H are
 * walkable. Faces where one wing butts into another are detected automatically
 * and left plain, so the data file never has to say "no windows here".
 */

import { Vector3 } from 'three';

import {
  BRIDGES,
  BUILDINGS,
  planPoint,
  planRect,
  type BridgeDef,
  type BuildingDef,
  type Facing,
  type WingDef,
} from '../config/campusLayout';
import type { MaterialKey } from '../config/palette';
import type { Vec2Tuple } from '../types';
import type { WorldBuildContext } from './context';

const PLINTH_HEIGHT = 0.45;
const VERANDAH_DEPTH = 2.4;
const EAVE_OVERHANG = 0.9;
const COLUMN_SIDE = 0.3;
const STAIR_TOWER_WIDTH = 3.6;
const STAIR_TOWER_DEPTH = 3;

const FACINGS: readonly Facing[] = ['north', 'south', 'east', 'west'];

/** Unit vector pointing out of each face, as `[x, z]`. */
const OUTWARD: Record<Facing, Vec2Tuple> = {
  north: [0, -1],
  south: [0, 1],
  east: [1, 0],
  west: [-1, 0],
};

/** `rotationY` (degrees) that turns local +Z to point out of the face. */
const FACE_ROTATION: Record<Facing, number> = { south: 0, north: 180, east: 90, west: -90 };

/** A wing resolved to world metres. */
interface Wing {
  readonly def: WingDef;
  readonly centre: Vec2Tuple;
  readonly halfWidth: number;
  readonly halfDepth: number;
}

export function buildBuildings(context: WorldBuildContext): void {
  for (const building of BUILDINGS) {
    const wings = building.wings.map(resolveWing);

    if (building.model === null) {
      for (const wing of wings) {
        buildWing(context, building, wing, wings);
      }
      if (building.entrance) {
        buildEntrance(context, building, wings);
      }
    }

    // Colliders and the plaque apply whether the building is placeholder
    // geometry or (later) a real model.
    for (const wing of wings) {
      registerWingCollider(context, building, wing, wings);
    }
    registerPlaque(context, building, wings);
  }

  for (const bridge of BRIDGES) {
    buildBridge(context, bridge);
  }
}

function resolveWing(def: WingDef): Wing {
  const { centre, size } = planRect(def.rect);
  return { def, centre, halfWidth: size[0] / 2, halfDepth: size[1] / 2 };
}

// ---------------------------------------------------------------------------
// Face geometry helpers
// ---------------------------------------------------------------------------

interface Face {
  /** Centre of the wall face, at ground level. */
  readonly centre: Vec2Tuple;
  readonly outward: Vec2Tuple;
  /** True when the face runs along X (north/south faces). */
  readonly alongX: boolean;
  readonly length: number;
}

function faceOf(wing: Wing, facing: Facing): Face {
  const [ox, oz] = OUTWARD[facing];
  const alongX = facing === 'north' || facing === 'south';
  return {
    centre: [wing.centre[0] + ox * wing.halfWidth, wing.centre[1] + oz * wing.halfDepth],
    outward: [ox, oz],
    alongX,
    length: alongX ? wing.halfWidth * 2 : wing.halfDepth * 2,
  };
}

/** World point `along` metres down the face and `out` metres in front of it. */
function onFace(face: Face, along: number, out: number): Vec2Tuple {
  return [
    face.centre[0] + (face.alongX ? along : 0) + face.outward[0] * out,
    face.centre[1] + (face.alongX ? 0 : along) + face.outward[1] * out,
  ];
}

/** `[sizeX, sizeZ]` for a box `along` long down the face and `out` deep. */
function faceBox(face: Face, along: number, out: number): readonly [number, number] {
  return face.alongX ? [along, out] : [out, along];
}

function insideWing(point: Vec2Tuple, wing: Wing, margin = 0): boolean {
  return (
    Math.abs(point[0] - wing.centre[0]) < wing.halfWidth - margin &&
    Math.abs(point[1] - wing.centre[1]) < wing.halfDepth - margin
  );
}

/** True when the point is buried inside a DIFFERENT wing of the same building. */
function coveredByOtherWing(point: Vec2Tuple, self: Wing, wings: readonly Wing[]): boolean {
  return wings.some((other) => other !== self && insideWing(point, other, -0.05));
}

/** Faces that really get a verandah: requested in data AND not butting into another wing. */
function verandahFaces(wing: Wing, wings: readonly Wing[]): Facing[] {
  return wing.def.verandah.filter((facing) => {
    const face = faceOf(wing, facing);
    return !coveredByOtherWing(onFace(face, 0, 0.6), wing, wings);
  });
}

/** Extra footprint each side, from verandahs. */
function padding(wing: Wing, wings: readonly Wing[]): Record<Facing, number> {
  const faces = verandahFaces(wing, wings);
  const pad = { north: 0, south: 0, east: 0, west: 0 };
  for (const facing of faces) {
    pad[facing] = VERANDAH_DEPTH;
  }
  return pad;
}

/** Footprint rectangle (centre + half extents) including verandahs. */
function paddedFootprint(
  wing: Wing,
  wings: readonly Wing[],
  extra: number,
): { centre: Vec2Tuple; halfWidth: number; halfDepth: number } {
  const pad = padding(wing, wings);
  const minX = wing.centre[0] - wing.halfWidth - pad.west - extra;
  const maxX = wing.centre[0] + wing.halfWidth + pad.east + extra;
  const minZ = wing.centre[1] - wing.halfDepth - pad.north - extra;
  const maxZ = wing.centre[1] + wing.halfDepth + pad.south + extra;
  return {
    centre: [(minX + maxX) / 2, (minZ + maxZ) / 2],
    halfWidth: (maxX - minX) / 2,
    halfDepth: (maxZ - minZ) / 2,
  };
}

// ---------------------------------------------------------------------------
// Wing
// ---------------------------------------------------------------------------

function buildWing(
  context: WorldBuildContext,
  building: BuildingDef,
  wing: Wing,
  wings: readonly Wing[],
): void {
  const { shapes } = context;
  const width = wing.halfWidth * 2;
  const depth = wing.halfDepth * 2;
  const height = building.height;

  // Plinth under the wing and its verandahs.
  const plinth = paddedFootprint(wing, wings, 0.5);
  shapes.boxAt('plinth', plinth.centre, 0, [plinth.halfWidth * 2, PLINTH_HEIGHT, plinth.halfDepth * 2]);

  // Main mass.
  shapes.boxAt(building.walls, wing.centre, PLINTH_HEIGHT, [width, height, depth]);

  // Floor bands — the slab edges that stripe every elevation in the art.
  const storeyHeight = height / building.storeys;
  for (let level = 1; level < building.storeys; level += 1) {
    shapes.boxAt(
      'column',
      wing.centre,
      PLINTH_HEIGHT + level * storeyHeight - 0.12,
      [width + 0.12, 0.24, depth + 0.12],
    );
  }

  for (const facing of FACINGS) {
    buildWindows(context, building, wing, wings, facing);
  }
  for (const facing of verandahFaces(wing, wings)) {
    buildVerandah(context, building, wing, facing);
  }
  if (wing.def.stairs) {
    buildStairTowers(context, building, wing, wings);
  }
  buildRoof(context, building, wing, wings);
}

function buildWindows(
  context: WorldBuildContext,
  building: BuildingDef,
  wing: Wing,
  wings: readonly Wing[],
  facing: Facing,
): void {
  const face = faceOf(wing, facing);
  const storeyHeight = building.height / building.storeys;
  const detailed = context.quality.windowDetail === 'full';
  const spacing = detailed ? 3.2 : 4.2;
  const windowWidth = 1.6;
  const count = Math.floor((face.length - 2) / spacing);
  if (count < 1) {
    return;
  }
  const span = (count - 1) * spacing;
  const hasVerandah = verandahFaces(wing, wings).includes(facing);

  for (let storey = 0; storey < building.storeys; storey += 1) {
    const floorY = PLINTH_HEIGHT + storey * storeyHeight;

    for (let index = 0; index < count; index += 1) {
      const along = -span / 2 + index * spacing;
      // Skip anything that would be buried inside a neighbouring wing.
      if (coveredByOtherWing(onFace(face, along, 0.6), wing, wings)) {
        continue;
      }

      // Corridor faces open onto rooms: every third bay is a door.
      const isDoor = hasVerandah && index % 3 === 1;
      const openingHeight = isDoor ? Math.min(2.4, storeyHeight * 0.72) : storeyHeight * 0.4;
      const sill = isDoor ? floorY : floorY + storeyHeight * 0.3;
      const openingWidth = isDoor ? 1.3 : windowWidth;

      if (detailed) {
        // Green frame standing just proud of the wall...
        const [frameX, frameZ] = faceBox(face, openingWidth + 0.24, 0.1);
        context.shapes.boxAt('trimGreen', onFace(face, along, 0.04), sill - 0.08, [
          frameX,
          openingHeight + 0.16,
          frameZ,
        ]);
      }
      // ...and the pane (or door leaf) in front of it.
      const [paneX, paneZ] = faceBox(face, openingWidth, 0.1);
      context.shapes.boxAt(
        isDoor ? 'trimGreen' : 'glass',
        onFace(face, along, 0.08),
        sill,
        [paneX, openingHeight, paneZ],
      );
    }
  }
}

function buildVerandah(
  context: WorldBuildContext,
  building: BuildingDef,
  wing: Wing,
  facing: Facing,
): void {
  const { shapes } = context;
  const face = faceOf(wing, facing);
  const storeyHeight = building.height / building.storeys;
  const runLength = face.length + 0.3;

  for (let level = 0; level < building.storeys; level += 1) {
    const slabY = PLINTH_HEIGHT + level * storeyHeight - (level === 0 ? 0.1 : 0.12);
    const [slabX, slabZ] = faceBox(face, runLength, VERANDAH_DEPTH);
    shapes.boxAt(level === 0 ? 'plinth' : 'column', onFace(face, 0, VERANDAH_DEPTH / 2), slabY, [
      slabX,
      level === 0 ? 0.12 : 0.24,
      slabZ,
    ]);

    if (level > 0) {
      // Green balustrade along the corridor edge.
      const [railX, railZ] = faceBox(face, runLength, 0.08);
      shapes.boxAt('trimGreen', onFace(face, 0, VERANDAH_DEPTH - 0.12), slabY + 0.24, [railX, 0.95, railZ]);
      const [capX, capZ] = faceBox(face, runLength, 0.16);
      shapes.boxAt('trimGreen', onFace(face, 0, VERANDAH_DEPTH - 0.12), slabY + 1.15, [capX, 0.08, capZ]);
    }
  }

  // Colonnade, one column roughly every 3.4 m.
  const columnCount = Math.max(2, Math.round(face.length / 3.4) + 1);
  const columnSpan = face.length - 0.4;
  for (let index = 0; index < columnCount; index += 1) {
    const along = -columnSpan / 2 + (index / (columnCount - 1)) * columnSpan;
    shapes.boxAt('column', onFace(face, along, VERANDAH_DEPTH - 0.22), PLINTH_HEIGHT, [
      COLUMN_SIDE,
      building.height,
      COLUMN_SIDE,
    ]);
  }
}

function buildStairTowers(
  context: WorldBuildContext,
  building: BuildingDef,
  wing: Wing,
  wings: readonly Wing[],
): void {
  const { shapes } = context;
  // Stairs go on the two SHORT ends.
  const ends: Facing[] = wing.halfWidth >= wing.halfDepth ? ['east', 'west'] : ['north', 'south'];
  const storeyHeight = building.height / building.storeys;

  for (const facing of ends) {
    const face = faceOf(wing, facing);
    if (coveredByOtherWing(onFace(face, 0, STAIR_TOWER_DEPTH + 0.5), wing, wings)) {
      continue;
    }
    const towerCentre = onFace(face, 0, STAIR_TOWER_DEPTH / 2);
    const [tx, tz] = faceBox(face, STAIR_TOWER_WIDTH, STAIR_TOWER_DEPTH);

    shapes.boxAt('plinth', towerCentre, 0, [tx + 0.6, PLINTH_HEIGHT, tz + 0.6]);
    shapes.boxAt(building.stairAccent, towerCentre, PLINTH_HEIGHT, [tx, building.height + 0.5, tz]);
    shapes.hipRoof('roofRed', {
      at: towerCentre,
      baseY: PLINTH_HEIGHT + building.height + 0.5,
      width: tx + 1,
      depth: tz + 1,
      height: 1.4,
    });

    // Zig-zag green stair flights on the outer face, one per storey.
    const flightLength = Math.hypot(STAIR_TOWER_WIDTH * 0.85, storeyHeight);
    const tilt = (Math.atan2(storeyHeight, STAIR_TOWER_WIDTH * 0.85) * 180) / Math.PI;
    for (let level = 0; level < building.storeys; level += 1) {
      const midY = PLINTH_HEIGHT + level * storeyHeight + storeyHeight / 2;
      const direction = level % 2 === 0 ? 1 : -1;
      const centre = onFace(face, 0, STAIR_TOWER_DEPTH + 0.08);
      // Flights run along the face; tiltedBox's long axis is local Z.
      shapes.tiltedBox(
        'trimGreen',
        [centre[0], midY, centre[1]],
        [0.12, 0.3, flightLength],
        face.alongX ? 90 : 0,
        direction * (face.alongX ? -tilt : tilt),
      );
      const [landingX, landingZ] = faceBox(face, STAIR_TOWER_WIDTH, 0.9);
      shapes.boxAt('column', onFace(face, 0, STAIR_TOWER_DEPTH + 0.45), PLINTH_HEIGHT + (level + 1) * storeyHeight - 0.15, [
        landingX,
        0.15,
        landingZ,
      ]);
    }

    context.sink.addBoxCollider(
      `${building.id}:stairs-${facing}`,
      onFace(face, 0, (STAIR_TOWER_DEPTH + 0.9) / 2),
      (face.alongX ? STAIR_TOWER_WIDTH : STAIR_TOWER_DEPTH + 0.9) / 2 + 0.2,
      (face.alongX ? STAIR_TOWER_DEPTH + 0.9 : STAIR_TOWER_WIDTH) / 2 + 0.2,
      0,
    );
  }
}

function buildRoof(
  context: WorldBuildContext,
  building: BuildingDef,
  wing: Wing,
  wings: readonly Wing[],
): void {
  const roof = paddedFootprint(wing, wings, EAVE_OVERHANG);
  const eavesY = PLINTH_HEIGHT + building.height;
  const width = roof.halfWidth * 2;
  const depth = roof.halfDepth * 2;

  // Green fascia band under the eaves, as in every elevation sheet.
  context.shapes.boxAt('trimGreen', roof.centre, eavesY - 0.05, [width, 0.32, depth]);

  if (building.roof === 'flat') {
    context.shapes.boxAt('roofRed', roof.centre, eavesY + 0.27, [width, 0.4, depth]);
    return;
  }
  context.shapes.hipRoof('roofRed', {
    at: roof.centre,
    baseY: eavesY + 0.27,
    width,
    depth,
    height: building.roofPitch,
  });
}

// ---------------------------------------------------------------------------
// Entrance, name board and plaque
// ---------------------------------------------------------------------------

interface EntranceSpot {
  readonly face: Face;
  readonly facing: Facing;
  /** Point on the wall face. */
  readonly at: Vec2Tuple;
  /** How far the verandah already projects, so the canopy starts beyond it. */
  readonly clear: number;
}

function entranceSpot(building: BuildingDef, wings: readonly Wing[]): EntranceSpot | null {
  if (!building.entrance) {
    return null;
  }
  const at = planPoint(building.entrance.at);
  const facing = building.entrance.facing;
  // The wing whose face the entrance point sits on.
  const wing =
    wings.find((candidate) => {
      const face = faceOf(candidate, facing);
      const distance = face.alongX ? Math.abs(at[1] - face.centre[1]) : Math.abs(at[0] - face.centre[0]);
      const along = face.alongX ? Math.abs(at[0] - face.centre[0]) : Math.abs(at[1] - face.centre[1]);
      return distance < 1 && along <= face.length / 2 + 0.5;
    }) ?? wings[0];
  if (!wing) {
    return null;
  }
  const face = faceOf(wing, facing);
  const clear = verandahFaces(wing, wings).includes(facing) ? VERANDAH_DEPTH : 0;
  return { face, facing, at, clear };
}

function buildEntrance(context: WorldBuildContext, building: BuildingDef, wings: readonly Wing[]): void {
  const spot = entranceSpot(building, wings);
  if (!spot) {
    return;
  }
  const { shapes } = context;
  const [ox, oz] = spot.face.outward;
  const out = (distance: number, along = 0): Vec2Tuple => {
    const ax = spot.face.alongX ? along : 0;
    const az = spot.face.alongX ? 0 : along;
    return [spot.at[0] + ox * distance + ax, spot.at[1] + oz * distance + az];
  };

  const canopyDepth = 2.6;
  const canopyWidth = 5.4;
  const canopyStart = spot.clear;
  const canopyY = Math.min(3.4, building.height / building.storeys - 0.2) + PLINTH_HEIGHT;
  const [cx, cz] = faceBox(spot.face, canopyWidth, canopyDepth);

  // Door, steps, canopy slab and its two columns.
  const [doorX, doorZ] = faceBox(spot.face, 2.4, 0.16);
  shapes.boxAt('trimGreen', out(0.08), PLINTH_HEIGHT, [doorX, 2.5, doorZ]);
  for (let step = 0; step < 3; step += 1) {
    const [sx, sz] = faceBox(spot.face, canopyWidth - 0.4, 0.45);
    shapes.boxAt('plinth', out(canopyStart + canopyDepth + 0.2 + step * 0.42), 0, [
      sx,
      PLINTH_HEIGHT - step * 0.15,
      sz,
    ]);
  }
  shapes.boxAt('plinth', out(canopyStart + canopyDepth / 2), 0, [cx, PLINTH_HEIGHT, cz]);
  shapes.boxAt('column', out(canopyStart + canopyDepth / 2), canopyY, [cx + 0.2, 0.22, cz + 0.2]);
  shapes.boxAt('trimGreen', out(canopyStart + canopyDepth / 2), canopyY + 0.22, [cx + 0.25, 0.12, cz + 0.25]);
  for (const side of [-1, 1] as const) {
    const columnAt = out(canopyStart + canopyDepth - 0.3, side * (canopyWidth / 2 - 0.35));
    shapes.boxAt('column', columnAt, PLINTH_HEIGHT, [COLUMN_SIDE, canopyY - PLINTH_HEIGHT, COLUMN_SIDE]);
    context.sink.addCircleCollider(`${building.id}:canopy-column-${side}`, columnAt, 0.3);
  }

  // Name board on the canopy's front edge, e.g. "LIBRARY".
  if (building.nameBoard) {
    const cell = context.labels.cell(building.nameBoard, 'board');
    const boardHeight = 0.7;
    const boardWidth = Math.min(canopyWidth + 1.5, boardHeight * cell.aspect);
    const labelHeight = boardWidth / cell.aspect;
    const labelAt = out(canopyStart + canopyDepth + 0.14);
    shapes.label(
      'signText',
      [labelAt[0], canopyY + 0.35 + labelHeight / 2, labelAt[1]],
      boardWidth,
      labelHeight,
      FACE_ROTATION[spot.facing],
      cell.uv,
    );
  }
}

function registerWingCollider(
  context: WorldBuildContext,
  building: BuildingDef,
  wing: Wing,
  wings: readonly Wing[],
): void {
  // Verandahs sit 0.45 m up on the plinth and the player has no step height,
  // so the corridor is inside the blocked footprint rather than walkable.
  const footprint = paddedFootprint(wing, wings, 0.25);
  context.sink.addBoxCollider(
    `${building.id}:wing`,
    footprint.centre,
    footprint.halfWidth,
    footprint.halfDepth,
    0,
  );
}

function registerPlaque(context: WorldBuildContext, building: BuildingDef, wings: readonly Wing[]): void {
  if (!building.plaque) {
    return;
  }
  const spot = entranceSpot(building, wings);
  let at: Vec2Tuple;
  let rotationY: number;

  if (spot) {
    const [ox, oz] = spot.face.outward;
    const along = 3.9;
    const out = spot.clear + 4;
    at = [
      spot.at[0] + ox * out + (spot.face.alongX ? along : 0),
      spot.at[1] + oz * out + (spot.face.alongX ? 0 : along),
    ];
    rotationY = FACE_ROTATION[spot.facing];
  } else {
    // No entrance: stand the plaque in front of the middle of the south side.
    const maxZ = Math.max(...wings.map((wing) => wing.centre[1] + wing.halfDepth));
    const minX = Math.min(...wings.map((wing) => wing.centre[0] - wing.halfWidth));
    const maxX = Math.max(...wings.map((wing) => wing.centre[0] + wing.halfWidth));
    at = [(minX + maxX) / 2 + 4.4, maxZ + 3.6];
    rotationY = 0;
  }

  context.shapes.boxAt('metalPole', at, 0, [0.12, 1.3, 0.12], rotationY);
  context.shapes.boxAt('kenteGold', at, 1.15, [0.95, 0.6, 0.08], rotationY);
  context.sink.addCircleCollider(`plaque:${building.id}`, at, 0.25);

  context.sink.addInteractable({
    id: `plaque:${building.id}`,
    position: new Vector3(at[0], 1.4, at[1]),
    radius: 3.4,
    promptLabel: `Read the ${building.name} plaque`,
    eyebrow: 'Building Plaque',
    title: building.plaque.title,
    body: building.plaque.body,
    ...(building.plaque.bullets ? { bullets: building.plaque.bullets } : {}),
  });
}

// ---------------------------------------------------------------------------
// Bridges and gateway canopies
// ---------------------------------------------------------------------------

function buildBridge(context: WorldBuildContext, bridge: BridgeDef): void {
  const { shapes } = context;
  const { centre, size } = planRect(bridge.rect);
  const [width, depth] = size;
  const deckMaterial: MaterialKey = 'column';

  shapes.boxAt(deckMaterial, centre, bridge.clearance, [width, bridge.depth, depth]);

  if (bridge.sign) {
    // Gateway canopy: a deep fascia carrying the sign, on two front columns.
    const facing = bridge.sign.facing;
    const [ox, oz] = OUTWARD[facing];
    const alongX = facing === 'north' || facing === 'south';
    const reach = alongX ? depth / 2 : width / 2;
    const span = alongX ? width : depth;
    for (const side of [-1, 1] as const) {
      const columnAt: Vec2Tuple = [
        centre[0] + ox * (reach - 0.4) + (alongX ? side * (span / 2 - 0.5) : 0),
        centre[1] + oz * (reach - 0.4) + (alongX ? 0 : side * (span / 2 - 0.5)),
      ];
      shapes.boxAt('column', columnAt, 0, [0.5, bridge.clearance, 0.5]);
      context.sink.addCircleCollider(`${bridge.id}:column-${side}`, columnAt, 0.4);
    }
    const cell = context.labels.cell(bridge.sign.text, 'board');
    const labelWidth = Math.min(span - 0.6, (bridge.depth - 0.25) * cell.aspect);
    const labelHeight = labelWidth / cell.aspect;
    shapes.label(
      'signText',
      [
        centre[0] + ox * (reach + 0.03),
        bridge.clearance + bridge.depth / 2,
        centre[1] + oz * (reach + 0.03),
      ],
      labelWidth,
      labelHeight,
      FACE_ROTATION[facing],
      cell.uv,
    );
    return;
  }

  // Footbridge: deck, green balustrades both sides and a red roof over it.
  const alongX = width >= depth;
  for (const side of [-1, 1] as const) {
    const railAt: Vec2Tuple = alongX
      ? [centre[0], centre[1] + side * (depth / 2 - 0.06)]
      : [centre[0] + side * (width / 2 - 0.06), centre[1]];
    shapes.boxAt('trimGreen', railAt, bridge.clearance + bridge.depth, alongX ? [width, 1, 0.08] : [0.08, 1, depth]);
  }
  shapes.hipRoof('roofRed', {
    at: centre,
    baseY: bridge.clearance + bridge.depth + 2.6,
    width: width + 0.8,
    depth: depth + 0.8,
    height: 0.9,
  });
}
