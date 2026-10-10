/**
 * World generation orchestrator.
 *
 * Runs each world module in turn, collects their geometry into the batcher and
 * their colliders/interactables into flat arrays, then merges everything into a
 * handful of static meshes.
 *
 * ORDER MATTERS in exactly one place: vegetation runs last, because the
 * scattered background belts need the finished collider list in order to reject
 * positions that would grow a tree through a wall.
 */

import { Group, type Mesh } from 'three';

import { WALKWAYS } from '../config/campusLayout';
import type { MaterialKey } from '../config/palette';
import type { QualityPreset } from '../config/settings';
import type { Collider, Interactable, Vec2Tuple } from '../types';
import { GeometryBatcher, type BatchStats } from '../utils/GeometryBatcher';
import type { MaterialLibrary } from '../utils/MaterialLibrary';
import { ShapeBuilder, degToRad } from '../utils/shapes';
import { buildBuildings } from './Buildings';
import { buildEntrance } from './Entrance';
import { buildGround } from './Ground';
import { buildProps } from './Props';
import { buildSignage } from './Signage';
import { buildVegetation } from './Vegetation';
import type { WorldBuildContext, WorldSink } from './context';

/**
 * Flat ground never needs to cast a shadow, and skipping it keeps a large,
 * nearly-screen-filling mesh out of the shadow pass.
 */
const NON_SHADOW_CASTING: ReadonlySet<MaterialKey> = new Set<MaterialKey>([
  'laterite',
  'lawn',
  'pavingLight',
  'pavingDark',
  'kerb',
]);

export interface BuiltWorld {
  /** All static campus geometry, ready to add to the scene. */
  readonly group: Group;
  readonly colliders: readonly Collider[];
  readonly interactables: readonly Interactable[];
  readonly stats: BatchStats;
}

export function buildWorld(quality: QualityPreset, materials: MaterialLibrary): BuiltWorld {
  const batcher = new GeometryBatcher();
  const shapes = new ShapeBuilder(batcher);

  const colliders: Collider[] = [];
  const interactables: Interactable[] = [];

  const sink: WorldSink = {
    addBoxCollider(sourceId, centre, halfWidth, halfDepth, rotationYDegrees) {
      colliders.push({
        kind: 'box',
        sourceId,
        x: centre[0],
        z: centre[1],
        halfWidth,
        halfDepth,
        // Colliders store RADIANS; the data files use degrees.
        rotationY: degToRad(rotationYDegrees),
      });
    },
    addCircleCollider(sourceId, centre, radius) {
      colliders.push({ kind: 'circle', sourceId, x: centre[0], z: centre[1], radius });
    },
    addInteractable(interactable) {
      interactables.push(interactable);
    },
  };

  const context: WorldBuildContext = { shapes, quality, sink };

  buildGround(context);
  buildEntrance(context);
  buildBuildings(context);
  buildProps(context);
  buildSignage(context);

  // Last: needs the collider list above to keep scattered trees off everything.
  buildVegetation(context, {
    existingColliders: colliders,
    keepClearRects: walkwayKeepClearRects(),
  });

  const { meshes, stats } = batcher.build({
    materialFor: (key) => materials.get(key),
    castShadow: (key) => !NON_SHADOW_CASTING.has(key),
    receiveShadow: () => true,
  });

  const group = new Group();
  group.name = 'campus';
  for (const mesh of meshes) {
    group.add(mesh);
  }

  return { group, colliders, interactables, stats };
}

/** Walkways and plazas that scattered trees must not grow through. */
function walkwayKeepClearRects(): { centre: Vec2Tuple; size: readonly [number, number] }[] {
  return WALKWAYS.map((walkway) => ({ centre: walkway.centre, size: walkway.size }));
}

/** Frees every merged geometry in a built world. Materials are owned elsewhere. */
export function disposeWorld(world: BuiltWorld): void {
  for (const child of world.group.children) {
    const mesh = child as Mesh;
    mesh.geometry?.dispose();
  }
  world.group.clear();
}
