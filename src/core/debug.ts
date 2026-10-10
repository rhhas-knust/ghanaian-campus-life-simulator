/**
 * Optional debug hook, enabled only by `?debug=1` in the URL.
 *
 * Exists for two reasons:
 *
 *  1. QA and automated smoke tests need to assert on real state — "did the
 *     player actually stop at the wall?" — without screen-scraping.
 *  2. The artist needs to stand at an exact coordinate to compare placeholder
 *     placement against their campus map, which is what `teleport` is for.
 *
 * Off by default, so nothing is attached to `window` for ordinary players.
 * See the "Testing" section of README.md.
 */

import type { BatchStats } from '../utils/GeometryBatcher';

export interface CampusDebugApi {
  /** Player position on the ground plane, and the direction they face. */
  getPlayer(): { x: number; z: number; yawDegrees: number; speed: number };
  /** Geometry batching statistics from world generation. */
  getStats(): BatchStats & { colliders: number; interactables: number };
  /** Current state machine phase. */
  getPhase(): string;
  /** `id` of the interactable currently in range, or `null`. */
  getFocusId(): string | null;
  /** Moves the player. Collision still applies on the next frame. */
  teleport(x: number, z: number, yawDegrees?: number): void;
  /** Name of the HUD zone the player is standing in. */
  getZoneName(): string;
}

declare global {
  interface Window {
    __campusDebug?: CampusDebugApi;
  }
}

export function isDebugEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('debug');
  } catch {
    return false;
  }
}

export function installDebugApi(api: CampusDebugApi): void {
  window.__campusDebug = api;
  // eslint-disable-next-line no-console
  console.info('[campus] debug API available as window.__campusDebug');
}
