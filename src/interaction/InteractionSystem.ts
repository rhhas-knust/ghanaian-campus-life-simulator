/**
 * Proximity interaction.
 *
 * Finds the one thing the player is close to AND roughly looking at, so the
 * prompt never fights between a building plaque and the notice board standing
 * next to it.
 *
 * Deliberately NOT a raycast. A raycast against the merged campus mesh would
 * have to hit the sign's own triangles, which means the player has to aim at a
 * board rather than walk up to it — fussy with a mouse and close to unusable
 * with a thumb on a phone.
 */

import { Vector3 } from 'three';

import type { Interactable } from '../types';

/**
 * How much the player has to be facing a target. `1` = dead centre, `0` = any
 * direction within 90 degrees. 0.25 is about a 75-degree cone either side,
 * which is forgiving enough for touch without ever picking something behind you.
 */
const MIN_FACING_DOT = 0.25;

export class InteractionSystem {
  private readonly toTarget = new Vector3();

  constructor(private interactables: readonly Interactable[]) {}

  /** Swaps the set of things in reach — on entering a building, or when the story moves someone. */
  replace(interactables: readonly Interactable[]): void {
    this.interactables = interactables;
  }

  get count(): number {
    return this.interactables.length;
  }

  /**
   * Returns the best candidate, or `null` when nothing is in range.
   *
   * Candidates are ranked by how close they are as a FRACTION of their own
   * radius, then by how centred they are. A big campus board with a 4 m radius
   * and a notice box with a 3 m radius therefore compete fairly.
   */
  findFocus(playerPosition: Vector3, flatForward: Vector3): Interactable | null {
    let best: Interactable | null = null;
    let bestScore = -Infinity;

    for (const interactable of this.interactables) {
      this.toTarget.copy(interactable.position).sub(playerPosition);
      this.toTarget.y = 0;

      const distance = this.toTarget.length();
      if (distance > interactable.radius || distance < 1e-4) {
        continue;
      }

      this.toTarget.divideScalar(distance);
      const facing = this.toTarget.dot(flatForward);
      if (facing < MIN_FACING_DOT) {
        continue;
      }

      const proximity = 1 - distance / interactable.radius;
      const score = proximity * 2 + facing;

      if (score > bestScore) {
        bestScore = score;
        best = interactable;
      }
    }

    return best;
  }
}
