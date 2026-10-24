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
  getPlayer(): { x: number; z: number; yawDegrees: number; pitch: number; speed: number };
  /** Camera mode and world position — for checking third-person framing. */
  getCamera(): { mode: string; x: number; y: number; z: number };
  /** Geometry batching statistics from world generation. */
  /**
   * Campus batching statistics, the active collision and interaction sets,
   * the current interior's batch count, and live GPU geometries and textures
   * — which must not grow as the player goes in and out of buildings.
   */
  getStats(): BatchStats & {
    colliders: number;
    interactables: number;
    interiorBatches: number;
    geometries: number;
    textures: number;
    /** Draw calls and triangles in the last frame drawn (shadow pass included). */
    drawCalls: number;
    frameTriangles: number;
    /** Whether the CC0 models loaded, or the placeholders are in use. */
    riggedCharacters: boolean;
    furnitureKit: boolean;
  };
  /** Current state machine phase. */
  getPhase(): string;
  /** `campus`, or the id of the interior the player is in. */
  getLocation(): string;
  /**
   * Sets story flags as if they had been earned, then saves. For tests and
   * for checking a mid-story scene without replaying the story to reach it.
   */
  setFlags(flags: string[]): void;
  /** The story so far, or `null` before character creation. */
  getStory(): {
    name: string;
    programme: string;
    missionId: string | null;
    objective: string;
    step: number;
    day: number;
    clock: string;
    flags: string[];
    relationships: Record<string, number>;
  } | null;
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
