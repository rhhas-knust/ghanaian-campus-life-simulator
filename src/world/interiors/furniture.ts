/**
 * Furniture and fittings for interiors, built from boxes and cylinders like
 * the campus props, and batched with them by palette key.
 *
 * Every builder works in the prop's LOCAL frame — +Z is the prop's front — and
 * `place` turns that into world space, so a desk reads the same whichever wall
 * it stands against. Solid furniture registers a box collider; things on walls
 * and ceilings do not.
 *
 * When the KayKit furniture kit has loaded, the kinds listed in
 * `FURNITURE_MODELS` are drawn from it instead of from boxes. The collider is
 * registered either way, from the same footprint, so the kit changes how a
 * room looks and never where the player can walk.
 */

import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

import { FURNITURE_MODELS } from '../../config/furnitureModels';
import type { PropDef } from '../../config/interiors';
import type { MaterialKey } from '../../config/palette';
import { degToRad, offsetLocal } from '../../utils/shapes';
import type { WorldBuildContext } from '../context';
import type { FurnitureKit } from './furnitureKit';

export interface FurnitureContext {
  readonly world: WorldBuildContext;
  readonly wallHeight: number;
  /** `null` when the kit did not load: everything is built from boxes. */
  readonly kit: FurnitureKit | null;
}

type Place = (material: MaterialKey, lx: number, y0: number, lz: number, w: number, h: number, d: number) => void;

export function buildProp(context: FurnitureContext, prop: PropDef, index: number): void {
  const { shapes, sink } = context.world;
  const fromKit = placeKitParts(context, prop);
  /**
   * Box by the centre of its bottom face, in the prop's local frame. Skipped
   * when the kit drew the prop: the cases below then only add its collider.
   */
  const place: Place = (material, lx, y0, lz, w, h, d) => {
    if (fromKit) {
      return;
    }
    const at = offsetLocal(prop.at, prop.rotationY, lx, lz);
    shapes.box(material, [at[0], y0 + h / 2, at[1]], [w, h, d], prop.rotationY);
  };
  const solid = (halfWidth: number, halfDepth: number, lx = 0, lz = 0): void => {
    sink.addBoxCollider(`prop:${prop.kind}:${index}`, offsetLocal(prop.at, prop.rotationY, lx, lz), halfWidth, halfDepth, prop.rotationY);
  };
  const legs = (material: MaterialKey, halfW: number, halfD: number, height: number): void => {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        place(material, sx * halfW, 0, sz * halfD, 0.05, height, 0.05);
      }
    }
  };

  switch (prop.kind) {
    case 'bed': {
      // Head at local +Z, against the wall.
      legs('fenceMetal', 0.43, 0.95, 0.36);
      place('fenceMetal', 0, 0.3, 0, 0.95, 0.06, 2);
      place('fenceMetal', 0, 0, 0.99, 0.95, 0.85, 0.04);
      place('canvasWhite', 0, 0.36, 0, 0.9, 0.18, 1.95);
      place('canvasWhite', 0, 0.54, 0.72, 0.6, 0.1, 0.36);
      place(prop.colour ?? 'fabricBlue', 0, 0.54, -0.3, 0.93, 0.05, 1.3);
      solid(0.48, 1);
      return;
    }
    case 'desk': {
      legs('woodWarm', 0.56, 0.24, 0.73);
      place('woodWarm', 0, 0.73, 0, 1.2, 0.04, 0.55);
      // Books and a lamp, towards the back.
      place('fabricBlue', -0.35, 0.77, -0.1, 0.22, 0.06, 0.3);
      place('kenteRed', -0.35, 0.83, -0.1, 0.2, 0.05, 0.28);
      place('canvasWhite', 0.1, 0.77, 0.05, 0.3, 0.01, 0.22);
      place('metalPole', 0.42, 0.77, -0.12, 0.05, 0.35, 0.05);
      place('lampGlass', 0.42, 1.08, -0.06, 0.16, 0.07, 0.16);
      solid(0.62, 0.3);
      return;
    }
    case 'chair': {
      legs('fenceMetal', 0.19, 0.19, 0.45);
      place('woodWarm', 0, 0.45, 0, 0.42, 0.04, 0.42);
      place('woodWarm', 0, 0.49, -0.2, 0.42, 0.42, 0.03);
      solid(0.23, 0.23);
      return;
    }
    case 'wardrobe': {
      place('doorWood', 0, 0, 0, 0.95, 2, 0.6);
      place('woodWarm', 0, 0.06, 0.305, 0.008, 1.88, 0.01);
      place('metalPole', -0.07, 1, 0.31, 0.03, 0.18, 0.03);
      place('metalPole', 0.07, 1, 0.31, 0.03, 0.18, 0.03);
      solid(0.5, 0.32);
      return;
    }
    case 'toolTable': {
      legs('woodWarm', 0.3, 0.2, 0.7);
      place('woodWarm', 0, 0.7, 0, 0.7, 0.04, 0.5);
      // Dead phones, a soldering iron on a tin lid.
      place('kenteBlack', -0.2, 0.74, 0, 0.08, 0.015, 0.15);
      place('kenteBlack', -0.05, 0.74, 0.08, 0.08, 0.015, 0.15);
      place('kenteBlack', 0.08, 0.74, -0.06, 0.08, 0.015, 0.15);
      place('metalPole', 0.22, 0.74, 0.05, 0.14, 0.01, 0.14);
      place('kenteRed', 0.22, 0.75, 0.05, 0.03, 0.03, 0.2);
      solid(0.37, 0.27);
      return;
    }
    case 'bucket': {
      shapes.cylinder(prop.colour ?? 'plasticBlue', { at: prop.at, baseY: 0, radius: 0.17, radiusTopRatio: 1.15, height: 0.34, segments: 10 });
      sink.addCircleCollider(`prop:bucket:${index}`, prop.at, 0.2);
      return;
    }
    case 'suitcase': {
      place('kenteBlack', 0, 0, 0, 0.7, 0.24, 0.46);
      place('metalPole', 0, 0.24, 0, 0.2, 0.03, 0.04);
      solid(0.36, 0.24);
      return;
    }
    case 'poster': {
      place(prop.colour ?? 'kenteGreen', 0, 1.2, 0, 0.62, 0.85, 0.02);
      place('canvasWhite', 0, 1.62, 0.012, 0.44, 0.1, 0.005);
      return;
    }
    case 'fan': {
      const hub = context.wallHeight - 0.42;
      place('metalPole', 0, hub, 0, 0.04, 0.42, 0.04);
      place('canvasWhite', 0, hub - 0.05, 0, 0.18, 0.08, 0.18);
      for (const angle of [0, 120, 240]) {
        const [bx, bz] = offsetLocal(prop.at, prop.rotationY + angle, 0, 0.42);
        shapes.box('canvasWhite', [bx, hub - 0.02, bz], [0.12, 0.015, 0.7], prop.rotationY + angle);
      }
      return;
    }
    case 'looseTile': {
      // A tile that sits a little proud and a shade off, with a dark gap round it.
      place('plinth', 0, 0, 0, 0.44, 0.012, 0.44);
      place('floorTerrazzo', 0.01, 0.004, -0.01, 0.4, 0.012, 0.4);
      return;
    }
    case 'sofa': {
      const fabric = prop.colour ?? 'fabricBlue';
      place('woodWarm', 0, 0, 0, 1.8, 0.2, 0.8);
      place(fabric, 0, 0.2, 0.04, 1.7, 0.2, 0.72);
      place(fabric, 0, 0.2, -0.33, 1.8, 0.62, 0.16);
      place(fabric, -0.86, 0.2, 0, 0.12, 0.4, 0.8);
      place(fabric, 0.86, 0.2, 0, 0.12, 0.4, 0.8);
      solid(0.92, 0.42);
      return;
    }
    case 'tv': {
      place('woodWarm', 0, 0, 0, 1.2, 0.5, 0.4);
      place('kenteBlack', 0, 0.75, -0.05, 1.1, 0.66, 0.06);
      place('glass', 0, 0.79, -0.015, 1.02, 0.58, 0.01);
      place('kenteBlack', 0, 0.5, -0.05, 0.2, 0.25, 0.08);
      solid(0.62, 0.22);
      return;
    }
    case 'table': {
      legs('woodWarm', 0.45, 0.3, 0.72);
      place('woodWarm', 0, 0.72, 0, 1, 0.04, 0.7);
      place('kenteGold', 0.2, 0.76, 0.1, 0.12, 0.1, 0.12);
      solid(0.52, 0.37);
      return;
    }
    case 'noticeBoard': {
      place('woodWarm', 0, 1.05, 0, 1.5, 0.95, 0.04);
      place('canvasWhite', -0.45, 1.25, 0.025, 0.3, 0.4, 0.005);
      place('kenteGold', -0.05, 1.15, 0.025, 0.28, 0.32, 0.005);
      place('canvasWhite', 0.35, 1.3, 0.025, 0.32, 0.42, 0.005);
      place('fabricOrange', 0.4, 1.12, 0.03, 0.2, 0.14, 0.005);
      if (prop.label) {
        label(context, prop, prop.label, 2.12, 0.04, 1.4);
      }
      return;
    }
    case 'waterDispenser': {
      place('canvasWhite', 0, 0, 0, 0.36, 1, 0.36);
      shapes.cylinder('plasticBlue', { at: prop.at, baseY: 1, radius: 0.14, height: 0.42, segments: 10 });
      place('metalPole', 0, 0.75, 0.19, 0.08, 0.05, 0.04);
      solid(0.2, 0.2);
      return;
    }
    case 'stairwell': {
      // The stairs go down into the dark: a void with a rail across it, and a
      // painted sign pointing the way out.
      place('kenteBlack', 0, 0, 0, 4, 0.012, 2.5);
      place('metalPole', 0, 0.98, 1.25, 3.7, 0.05, 0.05);
      place('metalPole', 0, 0.5, 1.25, 3.7, 0.03, 0.03);
      for (const lx of [-1.8, -0.6, 0.6, 1.8]) {
        place('metalPole', lx, 0, 1.25, 0.04, 1, 0.04);
      }
      // A flight climbing to the third floor along the back wall.
      for (let step = 0; step < 7; step += 1) {
        place('concrete', -1.6 + step * 0.32, step * 0.17, -1.05, 0.32, 0.17, 0.4);
      }
      label(context, prop, 'STAIRS ▸ COURT', 2.1, -1.22, 1.6);
      solid(2, 1.27);
      return;
    }
    case 'counter': {
      place('woodWarm', 0, 0, 0, 2.2, 1.02, 0.6);
      place('doorWood', 0, 1.02, 0, 2.3, 0.05, 0.7);
      // The sign-in book, open, at the south end of the counter.
      place('canvasWhite', 0.7, 1.07, 0.05, 0.42, 0.02, 0.3);
      place('kenteBlack', 0.7, 1.08, 0.05, 0.01, 0.01, 0.28);
      // A radio and a mug.
      place('kenteBlack', -0.65, 1.07, -0.1, 0.3, 0.16, 0.12);
      shapes.cylinder('kenteRed', { at: offsetLocal(prop.at, prop.rotationY, -0.25, 0.05), baseY: 1.07, radius: 0.045, height: 0.1, segments: 8 });
      solid(1.12, 0.33);
      return;
    }
    case 'keyBoard': {
      place('woodWarm', 0, 1.25, 0, 0.8, 0.55, 0.03);
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          place('metalPole', -0.3 + col * 0.15, 1.33 + row * 0.22, 0.03, 0.03, 0.09, 0.02);
        }
      }
      return;
    }
    case 'cabinet': {
      place('metalPole', 0, 0, 0, 1, 1.3, 0.45);
      for (const y of [0.42, 0.85]) {
        place('kenteBlack', 0, y, 0.226, 0.94, 0.012, 0.005);
      }
      place('kenteBlack', 0.36, 1.08, 0.23, 0.06, 0.06, 0.01);
      if (prop.label) {
        label(context, prop, prop.label, 1.55, 0.03, 0.9);
      }
      solid(0.52, 0.25);
      return;
    }
    case 'shelf': {
      place('woodWarm', 0, 1.3, 0, 1, 0.03, 0.28);
      shapes.cylinder('metalPole', { at: offsetLocal(prop.at, prop.rotationY, -0.25, 0), baseY: 1.33, radius: 0.08, height: 0.2, segments: 8 });
      place('kenteGreen', 0.2, 1.33, 0, 0.18, 0.24, 0.14);
      return;
    }
    case 'rug': {
      place(prop.colour ?? 'fabricOrange', 0, 0, 0, 1.2, 0.01, 0.9);
      return;
    }
    case 'openDoor': {
      // A door swung open against the wall, hinged at the frame.
      place('doorWood', 0, 0, 0, 0.05, 2.1, 0.95);
      place('metalPole', 0.04, 1, 0.38, 0.03, 0.03, 0.12);
      solid(0.04, 0.48);
      return;
    }
  }
}

const scratchMatrix = new Matrix4();
const scratchPosition = new Vector3();
const scratchRotation = new Quaternion();
const scratchEuler = new Euler();
const scratchScale = new Vector3();

/** Draws a prop from the furniture kit, if it has a model there. Returns whether it did. */
function placeKitParts(context: FurnitureContext, prop: PropDef): boolean {
  const model = FURNITURE_MODELS[prop.kind];
  const kit = context.kit;
  if (!model || !kit) {
    return false;
  }
  const parts = (prop.colour && model.byColour?.[prop.colour]) || model.parts;
  for (const part of parts) {
    const geometry = kit.pieces.get(part.piece);
    if (!geometry) {
      return false;
    }
    const [lx, lz] = part.at ?? [0, 0];
    const [x, z] = offsetLocal(prop.at, prop.rotationY, lx, lz);
    scratchPosition.set(x, part.y ?? 0, z);
    scratchRotation.setFromEuler(scratchEuler.set(0, degToRad(prop.rotationY + (part.rotationY ?? 0)), 0));
    scratchScale.set(...part.scale);
    scratchMatrix.compose(scratchPosition, scratchRotation, scratchScale);
    context.world.shapes.imported('furnitureKit', geometry, scratchMatrix);
  }
  return true;
}

/** One cell of the interior's sign atlas, on the prop's front face. */
export function label(context: FurnitureContext, prop: PropDef, text: string, centreY: number, lz: number, width: number): void {
  const cell = context.world.labels.cell(text, 'board');
  const height = width / cell.aspect;
  const at = offsetLocal(prop.at, prop.rotationY, 0, lz + 0.03);
  context.world.shapes.label('interiorSignText', [at[0], centreY, at[1]], width, height, prop.rotationY, cell.uv);
}

/** Every piece of lettering a prop list will ask for. */
export function propLabels(props: readonly PropDef[]): string[] {
  const labels: string[] = [];
  for (const prop of props) {
    if (prop.label) {
      labels.push(prop.label);
    }
    if (prop.kind === 'stairwell') {
      labels.push('STAIRS ▸ COURT');
    }
  }
  return labels;
}
