/**
 * World generation orchestrator.
 *
 * Runs each world module in turn, collects their geometry into the batcher and
 * their colliders and interactables into flat arrays, then merges everything
 * into a few dozen static meshes.
 *
 * Two ordering rules:
 *  - The sign atlas is built FIRST, from every label the data files mention,
 *    because world modules place lettering as they go.
 *  - Vegetation runs LAST, because the scattered belts need the finished
 *    collider list to keep trees out of buildings.
 */

import { Group, MeshLambertMaterial, type Mesh } from 'three';

import { BRIDGES, BUILDINGS } from '../config/campusLayout';
import type { MaterialKey } from '../config/palette';
import type { QualityPreset } from '../config/settings';
import type { Collider, Interactable } from '../types';
import { GeometryBatcher, type BatchStats } from '../utils/GeometryBatcher';
import type { MaterialLibrary } from '../utils/MaterialLibrary';
import { ShapeBuilder, degToRad } from '../utils/shapes';
import { buildBuildings } from './Buildings';
import { buildEntrance } from './Entrance';
import { buildGround } from './Ground';
import { buildProps } from './Props';
import { SignAtlas, type LabelStyle } from './SignAtlas';
import { buildSignage, signLabels } from './Signage';
import { buildVegetation } from './Vegetation';
import type { WorldBuildContext, WorldSink } from './context';

/**
 * Flat ground never needs to cast a shadow, and leaving it out keeps a large,
 * nearly screen-filling mesh out of the shadow pass.
 */
const NON_SHADOW_CASTING: ReadonlySet<MaterialKey> = new Set<MaterialKey>([
  'lawn',
  'lawnStripe',
  'asphalt',
  'roadMarking',
  'pavingTan',
  'pavingStone',
  'courtSurface',
  'signText',
]);

export interface BuiltWorld {
  /** All static campus geometry, ready to add to the scene. */
  readonly group: Group;
  readonly colliders: readonly Collider[];
  readonly interactables: readonly Interactable[];
  readonly stats: BatchStats;
  readonly signAtlas: SignAtlas;
}

export function buildWorld(quality: QualityPreset, materials: MaterialLibrary): BuiltWorld {
  const batcher = new GeometryBatcher();
  const shapes = new ShapeBuilder(batcher);

  const signAtlas = new SignAtlas(collectLabels());
  materials.register('signText', new MeshLambertMaterial({ map: signAtlas.texture }));

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

  const context: WorldBuildContext = { shapes, quality, sink, labels: signAtlas };

  buildGround(context);
  buildEntrance(context);
  buildBuildings(context);
  buildProps(context);
  buildSignage(context);
  // Last: reads the collider list above to keep scattered trees clear.
  buildVegetation(context, colliders);

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

  return { group, colliders, interactables, stats, signAtlas };
}

/** Every piece of lettering any world module will ask the atlas for. */
function collectLabels(): { text: string; style: LabelStyle }[] {
  const labels: { text: string; style: LabelStyle }[] = [];
  for (const building of BUILDINGS) {
    if (building.nameBoard) {
      labels.push({ text: building.nameBoard, style: 'board' });
    }
  }
  for (const bridge of BRIDGES) {
    if (bridge.sign) {
      labels.push({ text: bridge.sign.text, style: 'board' });
    }
  }
  labels.push(...signLabels());
  return labels;
}

/** Frees every merged geometry and the sign atlas. Materials are owned elsewhere. */
export function disposeWorld(world: BuiltWorld): void {
  for (const child of world.group.children) {
    (child as Mesh).geometry.dispose();
  }
  world.group.clear();
  world.signAtlas.dispose();
}
