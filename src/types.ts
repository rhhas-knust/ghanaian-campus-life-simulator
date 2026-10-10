/**
 * Shared types for the campus prototype.
 *
 * These are the contracts between the five subsystems — world generation,
 * collision, interaction, the player controller and the UI — so each one can be
 * edited (or replaced wholesale in a later phase) without touching the others.
 */

import type { Vector3 } from 'three';
import type { MaterialKey } from './config/palette';

/** `[x, z]` on the ground plane. Y is derived, because the campus is flat. */
export type Vec2Tuple = readonly [x: number, z: number];

/** `[width, height, depth]` in metres. */
export type SizeTuple = readonly [width: number, height: number, depth: number];

// ---------------------------------------------------------------- collision

/** A rotatable, axis-aligned-in-local-space footprint. Buildings, benches, walls. */
export interface BoxCollider {
  readonly kind: 'box';
  readonly x: number;
  readonly z: number;
  readonly halfWidth: number;
  readonly halfDepth: number;
  /** Rotation about the Y axis, in RADIANS. */
  readonly rotationY: number;
  /** For debugging and future "what am I touching?" queries. */
  readonly sourceId: string;
}

/** A simple round footprint. Tree trunks, lamp posts, bollards. */
export interface CircleCollider {
  readonly kind: 'circle';
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly sourceId: string;
}

export type Collider = BoxCollider | CircleCollider;

/** The outer wall of the playable area. The player is clamped inside it. */
export interface CampusBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

// -------------------------------------------------------------- interaction

/** Anything the player can walk up to and read. */
export interface Interactable {
  readonly id: string;
  /** World-space focus point — where the prompt "aims". */
  readonly position: Vector3;
  /** Metres within which the prompt appears. */
  readonly radius: number;
  /** Short verb shown next to the key hint, e.g. `Read sign`. */
  readonly promptLabel: string;
  /** Overline on the opened panel, e.g. `Campus Sign`. */
  readonly eyebrow: string;
  readonly title: string;
  /** Paragraphs. Rendered with `textContent`, so plain text only. */
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
}

// ------------------------------------------------------------------- zones

/** A named rectangle used only to label the player's location in the HUD. */
export interface ZoneDef {
  readonly id: string;
  readonly name: string;
  readonly centre: Vec2Tuple;
  readonly size: readonly [width: number, depth: number];
  /** Higher priority wins when rectangles overlap. */
  readonly priority: number;
}

// ------------------------------------------------------------------- world

/** Where the player starts, and which way they face. */
export interface SpawnDef {
  readonly position: Vec2Tuple;
  /** Yaw in DEGREES. 0 looks down -Z (north); 90 looks down -X (west). */
  readonly yawDegrees: number;
}

/**
 * Everything a world module hands back to the game. World modules never touch
 * the player, the UI or the collision system directly — they only contribute
 * geometry (through the batcher) plus these descriptors.
 */
export interface WorldContribution {
  readonly colliders: readonly Collider[];
  readonly interactables: readonly Interactable[];
}

/** A single batched geometry submission: which material, and where. */
export interface BatchEntry {
  readonly material: MaterialKey;
}

// --------------------------------------------------------------- input/state

/** Normalised, device-agnostic input for one frame. */
export interface MovementInput {
  /** -1 (back) … +1 (forward). */
  forward: number;
  /** -1 (left) … +1 (right). */
  right: number;
  sprint: boolean;
}

/** Accumulated look delta in radians, consumed and zeroed every frame. */
export interface LookDelta {
  yaw: number;
  pitch: number;
}

export type GamePhase = 'loading' | 'ready' | 'playing' | 'paused' | 'reading';
