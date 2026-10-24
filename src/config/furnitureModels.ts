/**
 * Which KayKit pieces stand in for which interior props — EDITABLE DATA FILE.
 *
 * A prop kind listed here is drawn from the furniture kit when it has loaded,
 * and from boxes (`src/world/interiors/furniture.ts`) when it has not. Either
 * way the prop keeps the collider it has always had, so swapping the look can
 * never change where the player can walk.
 *
 * Parts are in the prop's LOCAL frame (+Z is its front, y up from the floor).
 * The kit is not in metres — a KayKit single bed is 3 units long — so each
 * part carries its own scale, chosen to fit the procedural footprint.
 */

import type { FurniturePiece } from '../world/interiors/furnitureKit';
import type { PropKind } from './interiors';
import type { MaterialKey } from './palette';

export interface FurniturePart {
  readonly piece: FurniturePiece;
  /** Local offset [x, z] in metres; default the prop's centre. */
  readonly at?: readonly [number, number];
  /** Height of the piece's origin above the floor; default 0. */
  readonly y?: number;
  /** DEGREES, on top of the prop's own rotation. */
  readonly rotationY?: number;
  readonly scale: readonly [number, number, number];
}

export interface FurnitureModel {
  readonly parts: readonly FurniturePart[];
  /** Alternative parts for a prop's `colour`, e.g. the orange bedding. */
  readonly byColour?: Partial<Record<MaterialKey, readonly FurniturePart[]>>;
}

/** KayKit beds have the headboard at -Z; ours have it against the wall at +Z. */
const BED_SCALE = [0.62, 0.85, 0.66] as const;

export const FURNITURE_MODELS: Partial<Record<PropKind, FurnitureModel>> = {
  bed: {
    parts: [{ piece: 'bed_single_A', rotationY: 180, scale: BED_SCALE }],
    byColour: { fabricOrange: [{ piece: 'bed_single_B', rotationY: 180, scale: BED_SCALE }] },
  },
  desk: {
    parts: [
      { piece: 'table_medium_long', scale: [0.4, 0.75, 0.275] },
      { piece: 'book_set', at: [-0.33, -0.08], y: 0.85, scale: [0.4, 0.4, 0.4] },
      { piece: 'lamp_table', at: [0.4, -0.1], y: 0.75, scale: [0.32, 0.36, 0.32] },
    ],
  },
  chair: { parts: [{ piece: 'chair_A_wood', scale: [0.66, 0.72, 0.66] }] },
  sofa: { parts: [{ piece: 'couch', scale: [0.6, 0.66, 0.52] }] },
  table: { parts: [{ piece: 'table_medium', scale: [0.5, 0.72, 0.35] }] },
  rug: { parts: [{ piece: 'rug_rectangle_stripes_A', scale: [0.4, 0.15, 0.45] }] },
};
