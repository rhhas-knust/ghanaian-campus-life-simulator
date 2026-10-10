/**
 * Trees, shrubs and hedges.
 *
 * Five species, all built from the same handful of primitives:
 *
 *   palm        — tall bare trunk, radiating fronds. The avenue tree.
 *   mango       — short thick trunk, one dense low canopy. Deep shade.
 *   neem        — slimmer trunk, taller airy canopy. Everywhere in Ghana.
 *   flamboyant  — wide umbrella canopy with scarlet blossom.
 *   banana      — stubby stem with big drooping leaves.
 *
 * Hand-placed trees come from `TREES`; the background belts are filled by
 * seeded rejection sampling over `TREE_SCATTER_ZONES`, so the result is
 * identical on every device and every reload while staying cheap to author.
 */

import {
  HEDGES,
  TREES,
  TREE_SCATTER_ZONES,
  type TreeDef,
  type TreeScatterZoneDef,
  type TreeSpecies,
} from '../config/campusLayout';
import type { Collider, Vec2Tuple } from '../types';
import { SeededRandom } from '../utils/Random';
import type { WorldBuildContext } from './context';

/** Trunk radius used for the collider, per species. */
const TRUNK_COLLISION_RADIUS: Record<TreeSpecies, number> = {
  palm: 0.38,
  mango: 0.6,
  neem: 0.5,
  flamboyant: 0.62,
  banana: 0.35,
};

export interface VegetationOptions {
  /**
   * Colliders registered by earlier world modules. Scattered trees are rejected
   * if they would land on a building, bench or walkway, so the belts never grow
   * through a wall.
   */
  readonly existingColliders: readonly Collider[];
  /** Rectangles (walkways, plazas) that scattered trees must keep off. */
  readonly keepClearRects: readonly { centre: Vec2Tuple; size: readonly [number, number] }[];
}

export function buildVegetation(context: WorldBuildContext, options: VegetationOptions): void {
  for (const tree of TREES) {
    buildTree(context, tree);
  }

  for (const zone of TREE_SCATTER_ZONES) {
    scatterZone(context, zone, options);
  }

  buildHedges(context);
}

// ---------------------------------------------------------------------------
// Scattering
// ---------------------------------------------------------------------------

function scatterZone(
  context: WorldBuildContext,
  zone: TreeScatterZoneDef,
  options: VegetationOptions,
): void {
  const random = new SeededRandom(zone.seed);
  const target = Math.round(zone.count * context.quality.scatterDensity);
  const [width, depth] = zone.size;

  let placed = 0;
  // Bounded attempt count: a crowded zone must never spin forever.
  const maxAttempts = target * 12 + 24;

  for (let attempt = 0; attempt < maxAttempts && placed < target; attempt += 1) {
    const position: Vec2Tuple = [
      zone.centre[0] + random.range(-width / 2, width / 2),
      zone.centre[1] + random.range(-depth / 2, depth / 2),
    ];

    if (!isClear(position, zone.clearance, options)) {
      continue;
    }

    buildTree(context, {
      id: `${zone.id}-${placed}`,
      species: random.pick(zone.species),
      position,
      scale: random.range(zone.minScale, zone.maxScale),
      rotationY: random.range(0, 360),
    });
    placed += 1;
  }
}

function isClear(position: Vec2Tuple, clearance: number, options: VegetationOptions): boolean {
  for (const collider of options.existingColliders) {
    if (collider.kind === 'circle') {
      const dx = position[0] - collider.x;
      const dz = position[1] - collider.z;
      if (dx * dx + dz * dz < (collider.radius + clearance) ** 2) {
        return false;
      }
    } else {
      const angle = collider.rotationY;
      const dx = position[0] - collider.x;
      const dz = position[1] - collider.z;
      const localX = dx * Math.cos(angle) - dz * Math.sin(angle);
      const localZ = dx * Math.sin(angle) + dz * Math.cos(angle);
      if (
        Math.abs(localX) < collider.halfWidth + clearance &&
        Math.abs(localZ) < collider.halfDepth + clearance
      ) {
        return false;
      }
    }
  }

  for (const rect of options.keepClearRects) {
    if (
      Math.abs(position[0] - rect.centre[0]) < rect.size[0] / 2 + clearance &&
      Math.abs(position[1] - rect.centre[1]) < rect.size[1] / 2 + clearance
    ) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Species
// ---------------------------------------------------------------------------

function buildTree(context: WorldBuildContext, tree: TreeDef): void {
  switch (tree.species) {
    case 'palm':
      buildPalm(context, tree);
      break;
    case 'mango':
      buildBroadleaf(context, tree, { trunkHeight: 2.6, canopyRadius: 3.6, squashY: 0.78, leaf: 'leafDark' });
      break;
    case 'neem':
      buildBroadleaf(context, tree, { trunkHeight: 4, canopyRadius: 3.1, squashY: 0.9, leaf: 'leafMid' });
      break;
    case 'flamboyant':
      buildFlamboyant(context, tree);
      break;
    case 'banana':
      buildBanana(context, tree);
      break;
  }

  context.sink.addCircleCollider(
    `tree:${tree.id}`,
    tree.position,
    TRUNK_COLLISION_RADIUS[tree.species] * tree.scale,
  );
}

function buildPalm(context: WorldBuildContext, tree: TreeDef): void {
  const scale = tree.scale;
  const trunkHeight = 7.6 * scale;
  const trunkRadius = 0.26 * scale;

  context.shapes.cylinder('trunkPalm', {
    at: tree.position,
    baseY: 0,
    radius: trunkRadius,
    radiusTopRatio: 0.72,
    height: trunkHeight,
    segments: 7,
  });

  // Crown shaft.
  context.shapes.blob('leafDark', {
    centre: [tree.position[0], trunkHeight, tree.position[1]],
    radius: 0.42 * scale,
    squash: [1, 0.8, 1],
  });

  // Nine fronds, radiating and drooping.
  const frondCount = 9;
  for (let index = 0; index < frondCount; index += 1) {
    const angle = tree.rotationY + (index / frondCount) * 360;
    const droop = index % 2 === 0 ? 24 : 42;
    const length = (3.5 + (index % 3) * 0.35) * scale;
    const radians = (angle * Math.PI) / 180;
    const reach = length * 0.42;

    context.shapes.tiltedBox(
      'frond',
      [
        tree.position[0] + Math.sin(radians) * reach,
        trunkHeight - Math.sin((droop * Math.PI) / 180) * reach * 0.8,
        tree.position[1] + Math.cos(radians) * reach,
      ],
      [0.55 * scale, 0.07 * scale, length],
      angle,
      droop,
    );
  }
}

interface BroadleafOptions {
  readonly trunkHeight: number;
  readonly canopyRadius: number;
  readonly squashY: number;
  readonly leaf: 'leafDark' | 'leafMid' | 'leafLight';
}

function buildBroadleaf(
  context: WorldBuildContext,
  tree: TreeDef,
  options: BroadleafOptions,
): void {
  const scale = tree.scale;
  const trunkHeight = options.trunkHeight * scale;
  const canopyRadius = options.canopyRadius * scale;

  context.shapes.cylinder('trunk', {
    at: tree.position,
    baseY: 0,
    radius: 0.38 * scale,
    radiusTopRatio: 0.74,
    height: trunkHeight + 0.6,
    segments: 7,
  });

  // Three overlapping lobes read as a far denser canopy than a single sphere.
  const lobes: { offset: readonly [number, number, number]; radius: number }[] = [
    { offset: [0, trunkHeight + canopyRadius * 0.55, 0], radius: canopyRadius },
    {
      offset: [canopyRadius * 0.5, trunkHeight + canopyRadius * 0.3, canopyRadius * 0.2],
      radius: canopyRadius * 0.68,
    },
    {
      offset: [-canopyRadius * 0.42, trunkHeight + canopyRadius * 0.35, -canopyRadius * 0.34],
      radius: canopyRadius * 0.62,
    },
  ];

  for (const lobe of lobes) {
    const radians = (tree.rotationY * Math.PI) / 180;
    const ox = lobe.offset[0] * Math.cos(radians) - lobe.offset[2] * Math.sin(radians);
    const oz = lobe.offset[0] * Math.sin(radians) + lobe.offset[2] * Math.cos(radians);
    context.shapes.blob(options.leaf, {
      centre: [tree.position[0] + ox, lobe.offset[1], tree.position[1] + oz],
      radius: lobe.radius,
      squash: [1.08, options.squashY, 1.08],
      rotationY: tree.rotationY,
    });
  }
}

function buildFlamboyant(context: WorldBuildContext, tree: TreeDef): void {
  const scale = tree.scale;
  const trunkHeight = 3.4 * scale;
  const canopyRadius = 4.8 * scale;

  context.shapes.cylinder('trunk', {
    at: tree.position,
    baseY: 0,
    radius: 0.46 * scale,
    radiusTopRatio: 0.6,
    height: trunkHeight,
    segments: 8,
  });

  // Wide, flat umbrella — the flamboyant's signature silhouette.
  context.shapes.blob('leafMid', {
    centre: [tree.position[0], trunkHeight + canopyRadius * 0.3, tree.position[1]],
    radius: canopyRadius,
    squash: [1, 0.42, 1],
    rotationY: tree.rotationY,
  });

  // Scarlet blossom dotted over the top.
  for (let index = 0; index < 4; index += 1) {
    const angle = tree.rotationY + index * 90 + 20;
    const radians = (angle * Math.PI) / 180;
    context.shapes.blob('blossom', {
      centre: [
        tree.position[0] + Math.sin(radians) * canopyRadius * 0.55,
        trunkHeight + canopyRadius * 0.46,
        tree.position[1] + Math.cos(radians) * canopyRadius * 0.55,
      ],
      radius: canopyRadius * 0.26,
      squash: [1, 0.35, 1],
    });
  }
}

function buildBanana(context: WorldBuildContext, tree: TreeDef): void {
  const scale = tree.scale;
  const stemHeight = 2.3 * scale;

  context.shapes.cylinder('leafDark', {
    at: tree.position,
    baseY: 0,
    radius: 0.22 * scale,
    radiusTopRatio: 0.8,
    height: stemHeight,
    segments: 6,
  });

  for (let index = 0; index < 6; index += 1) {
    const angle = tree.rotationY + index * 61;
    const radians = (angle * Math.PI) / 180;
    const length = 2.1 * scale;
    context.shapes.tiltedBox(
      'frond',
      [
        tree.position[0] + Math.sin(radians) * length * 0.38,
        stemHeight - 0.25 * scale,
        tree.position[1] + Math.cos(radians) * length * 0.38,
      ],
      [0.78 * scale, 0.06 * scale, length],
      angle,
      34,
    );
  }
}

// ---------------------------------------------------------------------------
// Hedges
// ---------------------------------------------------------------------------

function buildHedges(context: WorldBuildContext): void {
  for (const hedge of HEDGES) {
    const dx = hedge.to[0] - hedge.from[0];
    const dz = hedge.to[1] - hedge.from[1];
    const length = Math.hypot(dx, dz);
    if (length < 0.1) {
      continue;
    }

    const centre: Vec2Tuple = [
      (hedge.from[0] + hedge.to[0]) / 2,
      (hedge.from[1] + hedge.to[1]) / 2,
    ];
    // Rotate so the hedge's local Z axis runs from `from` to `to`.
    const rotationY = (Math.atan2(dx, dz) * 180) / Math.PI;

    context.shapes.boxAt(
      'hedge',
      centre,
      0,
      [hedge.thickness, hedge.height, length],
      rotationY,
    );

    // Knee-high hedges are a visual boundary, not a wall — no collider. Anything
    // waist-high or above does block the player.
    if (hedge.height >= 1) {
      context.sink.addBoxCollider(
        `hedge:${hedge.id}`,
        centre,
        hedge.thickness / 2,
        length / 2,
        rotationY,
      );
    }
  }
}
