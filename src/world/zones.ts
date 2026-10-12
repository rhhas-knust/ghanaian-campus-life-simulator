/**
 * Resolves the player's `[x, z]` to a human-readable place name for the HUD.
 *
 * Zones are plain rectangles from `campusLayout.ts`. Where they overlap, the
 * highest `priority` wins, so "Library" beats the default "Central Campus".
 */

import { DEFAULT_ZONE_NAME, ZONES } from '../config/campusLayout';

export function resolveZoneName(x: number, z: number): string {
  let bestName = DEFAULT_ZONE_NAME;
  let bestPriority = -1;

  for (const zone of ZONES) {
    const withinX = Math.abs(x - zone.centre[0]) <= zone.size[0] / 2;
    const withinZ = Math.abs(z - zone.centre[1]) <= zone.size[1] / 2;
    if (withinX && withinZ && zone.priority > bestPriority) {
      bestPriority = zone.priority;
      bestName = zone.name;
    }
  }

  return bestName;
}
