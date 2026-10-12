/**
 * The contract between the orchestrator (`WorldBuilder`) and the individual
 * world modules.
 *
 * A world module is handed a `WorldBuildContext`, submits geometry through
 * `shapes`, and registers colliders and interactables through `sink`. It never
 * touches the scene graph, the camera, the player or the DOM — which is what
 * makes each one independently replaceable when the artist's real assets arrive.
 */

import type { QualityPreset } from '../config/settings';
import type { Interactable, Vec2Tuple } from '../types';
import type { ShapeBuilder } from '../utils/shapes';
import type { SignAtlas } from './SignAtlas';

export interface WorldSink {
  /**
   * Registers a rectangular footprint the player cannot walk through.
   * `rotationYDegrees` matches the data files; half-extents are in LOCAL axes.
   */
  addBoxCollider(
    sourceId: string,
    centre: Vec2Tuple,
    halfWidth: number,
    halfDepth: number,
    rotationYDegrees: number,
  ): void;

  /** Registers a round footprint — trunks, posts, bollards. */
  addCircleCollider(sourceId: string, centre: Vec2Tuple, radius: number): void;

  /** Registers something the player can walk up to and read. */
  addInteractable(interactable: Interactable): void;
}

export interface WorldBuildContext {
  readonly shapes: ShapeBuilder;
  readonly quality: QualityPreset;
  readonly sink: WorldSink;
  /** Lettering for signs and name boards; draw with `shapes.label`. */
  readonly labels: SignAtlas;
}
