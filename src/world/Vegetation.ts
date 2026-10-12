/**
 * Trees and hedges, after `GAME_ART/props/campus_props_reference.jpeg`.
 *
 *   palm        — tall coconut palm, drooping fronds. Lines the entrance road.
 *   fanPalm     — short ringed trunk, a ball of stiff fan fronds.
 *   mango       — dense low canopy with fruit. Deep shade.
 *   neem        — taller, airier canopy. Everywhere in Ghana.
 *   flamboyant  — wide umbrella canopy with scarlet blossom.
 *
 * Hand-placed trees come from `TREES`. The background belts come from seeded
 * rejection sampling over `TREE_SCATTER_ZONES`, which keeps clear of
 * buildings, roads, footpaths and the courtyard ring — so the result is
 * identical on every device and never grows a tree through a wall or a road.
 */

import {
  CAR_PARKS,
  FOOTBALL_FIELD,
  BASKETBALL_COURT,
  HEDGES,
  PATHS,
  ROADS,
  ROAD_DISCS,
  TREES,
  TREE_SCATTER_ZONES,
  planLength,
  planPoint,
  planRect,
  type TreeScatterZoneDef,
  type TreeSpecies,
} from '../config/campusLayout';
import type { Collider, Vec2Tuple } from '../types';
import { SeededRandom } from '../utils/Random';
import type { WorldBuildContext } from './context';

/** Trunk radius used for the collider, per species. */
const TRUNK_RADIUS: Record<TreeSpecies, number> = {
  palm: 0.32,
  fanPalm: 0.36,
  mango: 0.5,
  neem: 0.42,
  flamboyant: 0.55,
};

interface PlacedTree {
  readonly species: TreeSpecies;
  readonly at: Vec2Tuple;
  readonly scale: number;
  readonly rotationY: number;
}

interface KeepClear {
  readonly rects: { centre: Vec2Tuple; half: Vec2Tuple }[];
  readonly discs: { centre: Vec2Tuple; radius: number }[];
}

export function buildVegetation(context: WorldBuildContext, existingColliders: readonly Collider[]): void {
  for (const tree of TREES) {
    buildTree(context, {
      species: tree.species,
      at: planPoint(tree.at),
      scale: tree.scale,
      rotationY: (tree.at[0] * 37 + tree.at[1] * 11) % 360,
    });
  }

  const keepClear = keepClearAreas();
  for (const zone of TREE_SCATTER_ZONES) {
    scatter(context, zone, existingColliders, keepClear);
  }

  buildHedges(context);
}

// ---------------------------------------------------------------------------
// Scattering
// ---------------------------------------------------------------------------

function keepClearAreas(): KeepClear {
  const rects = [
    ...ROADS.map((road) => road.rect),
    ...PATHS.map((path) => path.rect),
    ...CAR_PARKS.map((carPark) => carPark.rect),
    FOOTBALL_FIELD.surround,
    BASKETBALL_COURT.court,
  ].map((rect) => {
    const { centre, size } = planRect(rect);
    return { centre, half: [size[0] / 2, size[1] / 2] as Vec2Tuple };
  });
  const discs = ROAD_DISCS.filter((disc) => disc.material !== 'lawn').map((disc) => ({
    centre: planPoint(disc.centre),
    radius: planLength(disc.radiusPx),
  }));
  return { rects, discs };
}

function scatter(
  context: WorldBuildContext,
  zone: TreeScatterZoneDef,
  colliders: readonly Collider[],
  keepClear: KeepClear,
): void {
  const random = new SeededRandom(zone.seed);
  const target = Math.round(zone.count * context.quality.scatterDensity);
  const { centre, size } = planRect(zone.rect);
  let placed = 0;
  // Bounded: a crowded zone must never spin forever.
  const maxAttempts = target * 16 + 32;

  for (let attempt = 0; attempt < maxAttempts && placed < target; attempt += 1) {
    const at: Vec2Tuple = [
      centre[0] + random.range(-size[0] / 2, size[0] / 2),
      centre[1] + random.range(-size[1] / 2, size[1] / 2),
    ];
    if (!isClear(at, zone.clearance, colliders, keepClear)) {
      continue;
    }
    buildTree(context, {
      species: random.pick(zone.species),
      at,
      scale: random.range(zone.minScale, zone.maxScale),
      rotationY: random.range(0, 360),
    });
    placed += 1;
  }
}

function isClear(at: Vec2Tuple, clearance: number, colliders: readonly Collider[], keepClear: KeepClear): boolean {
  for (const collider of colliders) {
    if (collider.kind === 'circle') {
      if (Math.hypot(at[0] - collider.x, at[1] - collider.z) < collider.radius + clearance) {
        return false;
      }
      continue;
    }
    const cos = Math.cos(collider.rotationY);
    const sin = Math.sin(collider.rotationY);
    const dx = at[0] - collider.x;
    const dz = at[1] - collider.z;
    const localX = dx * cos - dz * sin;
    const localZ = dx * sin + dz * cos;
    if (Math.abs(localX) < collider.halfWidth + clearance && Math.abs(localZ) < collider.halfDepth + clearance) {
      return false;
    }
  }
  for (const rect of keepClear.rects) {
    if (
      Math.abs(at[0] - rect.centre[0]) < rect.half[0] + clearance * 0.6 &&
      Math.abs(at[1] - rect.centre[1]) < rect.half[1] + clearance * 0.6
    ) {
      return false;
    }
  }
  for (const disc of keepClear.discs) {
    if (Math.hypot(at[0] - disc.centre[0], at[1] - disc.centre[1]) < disc.radius + clearance * 0.6) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

function buildTree(context: WorldBuildContext, tree: PlacedTree): void {
  switch (tree.species) {
    case 'palm':
      buildPalm(context, tree);
      break;
    case 'fanPalm':
      buildFanPalm(context, tree);
      break;
    case 'mango':
      buildBroadleaf(context, tree, { trunk: 2.4, canopy: 3.3, squash: 0.8, leaf: 'leafDark', fruit: true });
      break;
    case 'neem':
      buildBroadleaf(context, tree, { trunk: 3.8, canopy: 2.9, squash: 0.92, leaf: 'leafMid', fruit: false });
      break;
    case 'flamboyant':
      buildFlamboyant(context, tree);
      break;
  }
  context.sink.addCircleCollider(`tree:${tree.species}`, tree.at, TRUNK_RADIUS[tree.species] * tree.scale);
}

function radial(tree: PlacedTree, angleDegrees: number, distance: number): Vec2Tuple {
  const radians = (angleDegrees * Math.PI) / 180;
  return [tree.at[0] + Math.sin(radians) * distance, tree.at[1] + Math.cos(radians) * distance];
}

function buildPalm(context: WorldBuildContext, tree: PlacedTree): void {
  const s = tree.scale;
  const height = 7.4 * s;
  context.shapes.cylinder('trunkPalm', { at: tree.at, baseY: 0, radius: 0.24 * s, radiusTopRatio: 0.72, height, segments: 7 });
  context.shapes.blob('leafDark', { centre: [tree.at[0], height, tree.at[1]], radius: 0.4 * s, squash: [1, 0.8, 1] });

  for (let index = 0; index < 9; index += 1) {
    const angle = tree.rotationY + index * 40;
    const droop = index % 2 === 0 ? 22 : 40;
    const length = (3.4 + (index % 3) * 0.3) * s;
    const reach = length * 0.42;
    const [x, z] = radial(tree, angle, reach);
    context.shapes.tiltedBox(
      'frond',
      [x, height - Math.sin((droop * Math.PI) / 180) * reach * 0.8, z],
      [0.6 * s, 0.06 * s, length],
      angle,
      droop,
    );
  }
}

/** Ringed trunk and a dense ball of short, stiff fronds. */
function buildFanPalm(context: WorldBuildContext, tree: PlacedTree): void {
  const s = tree.scale;
  const height = 3.6 * s;
  context.shapes.cylinder('trunkPalm', { at: tree.at, baseY: 0, radius: 0.3 * s, radiusTopRatio: 0.85, height, segments: 7 });
  for (let ring = 1; ring < 4; ring += 1) {
    context.shapes.cylinder('trunk', { at: tree.at, baseY: ring * height * 0.24, radius: 0.33 * s, height: 0.12 * s, segments: 7 });
  }
  for (let index = 0; index < 12; index += 1) {
    const angle = tree.rotationY + index * 30;
    const lift = index % 3 === 0 ? -35 : index % 3 === 1 ? 5 : 30;
    const length = 2.2 * s;
    const [x, z] = radial(tree, angle, length * 0.45);
    context.shapes.tiltedBox(
      'leafLight',
      [x, height + Math.sin((-lift * Math.PI) / 180) * length * 0.4, z],
      [0.9 * s, 0.05 * s, length],
      angle,
      lift,
    );
  }
}

interface BroadleafOptions {
  readonly trunk: number;
  readonly canopy: number;
  readonly squash: number;
  readonly leaf: 'leafDark' | 'leafMid' | 'leafLight';
  readonly fruit: boolean;
}

function buildBroadleaf(context: WorldBuildContext, tree: PlacedTree, options: BroadleafOptions): void {
  const s = tree.scale;
  const trunk = options.trunk * s;
  const canopy = options.canopy * s;
  context.shapes.cylinder('trunk', { at: tree.at, baseY: 0, radius: 0.34 * s, radiusTopRatio: 0.7, height: trunk + 0.6, segments: 7 });

  // Three overlapping lobes read as a far denser canopy than a single ball.
  const lobes = [
    { angle: 0, out: 0, y: trunk + canopy * 0.55, r: canopy },
    { angle: tree.rotationY + 60, out: canopy * 0.5, y: trunk + canopy * 0.3, r: canopy * 0.68 },
    { angle: tree.rotationY + 220, out: canopy * 0.48, y: trunk + canopy * 0.35, r: canopy * 0.62 },
  ];
  for (const lobe of lobes) {
    const [x, z] = radial(tree, lobe.angle, lobe.out);
    context.shapes.blob(options.leaf, {
      centre: [x, lobe.y, z],
      radius: lobe.r,
      squash: [1.08, options.squash, 1.08],
      rotationY: tree.rotationY,
    });
  }

  if (options.fruit) {
    // A few mangoes hanging below the canopy edge.
    for (let index = 0; index < 6; index += 1) {
      const angle = tree.rotationY + index * 60 + 15;
      const [x, z] = radial(tree, angle, canopy * 0.82);
      context.shapes.blob('mangoFruit', {
        centre: [x, trunk + canopy * 0.05 + (index % 2) * 0.4, z],
        radius: 0.16 * s,
        squash: [0.8, 1.15, 0.8],
      });
    }
  }
}

function buildFlamboyant(context: WorldBuildContext, tree: PlacedTree): void {
  const s = tree.scale;
  const trunk = 3.2 * s;
  const canopy = 4.6 * s;
  context.shapes.cylinder('trunk', { at: tree.at, baseY: 0, radius: 0.44 * s, radiusTopRatio: 0.6, height: trunk, segments: 8 });
  context.shapes.blob('leafMid', {
    centre: [tree.at[0], trunk + canopy * 0.3, tree.at[1]],
    radius: canopy,
    squash: [1, 0.42, 1],
    rotationY: tree.rotationY,
  });
  for (let index = 0; index < 4; index += 1) {
    const [x, z] = radial(tree, tree.rotationY + index * 90 + 20, canopy * 0.55);
    context.shapes.blob('blossom', { centre: [x, trunk + canopy * 0.46, z], radius: canopy * 0.26, squash: [1, 0.35, 1] });
  }
}

// ---------------------------------------------------------------------------
// Hedges
// ---------------------------------------------------------------------------

function buildHedges(context: WorldBuildContext): void {
  for (const hedge of HEDGES) {
    const from = planPoint(hedge.from);
    const to = planPoint(hedge.to);
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.1) {
      continue;
    }
    const centre: Vec2Tuple = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    const rotationY = (Math.atan2(dx, dz) * 180) / Math.PI;
    context.shapes.boxAt('hedge', centre, 0, [0.9, hedge.height, length], rotationY);

    // Knee-high planting is a visual edge, not a wall.
    if (hedge.height >= 1) {
      context.sink.addBoxCollider(`hedge:${hedge.id}`, centre, 0.45, length / 2, rotationY);
    }
  }
}
