/**
 * Ground, lawns and paved walkways.
 *
 * Everything here is a flat horizontal quad — two triangles each — stacked in
 * thin layers a few millimetres apart to avoid z-fighting. That is dramatically
 * cheaper than a displaced terrain mesh, and the campus is flat in Phase 1
 * anyway.
 *
 * Layer heights (metres above y = 0):
 *   0.000  base laterite ground plane (the whole world)
 *   0.010  ground patches: lawns, the gate forecourt
 *   0.025  walkways
 *   0.030  walkway inlays
 *   0.040  kerbs (geometry, not quads)
 */

import { CAMPUS_BOUNDS, GROUND_PATCHES, WALKWAYS } from '../config/campusLayout';
import type { WorldBuildContext } from './context';

const LAYER_PATCH = 0.01;
const LAYER_WALKWAY = 0.025;
const LAYER_INLAY = 0.03;

export function buildGround(context: WorldBuildContext): void {
  buildBasePlane(context);
  buildPatches(context);
  buildWalkways(context);
}

/** One big quad of bare red earth under everything, extended past the walls. */
function buildBasePlane(context: WorldBuildContext): void {
  const width = CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX + 120;
  const depth = CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ + 120;
  const centreX = (CAMPUS_BOUNDS.maxX + CAMPUS_BOUNDS.minX) / 2;
  const centreZ = (CAMPUS_BOUNDS.maxZ + CAMPUS_BOUNDS.minZ) / 2;

  context.shapes.ground('laterite', [centreX, centreZ], [width, depth], 0);
}

function buildPatches(context: WorldBuildContext): void {
  for (const patch of GROUND_PATCHES) {
    context.shapes.ground(
      patch.material,
      patch.centre,
      patch.size,
      LAYER_PATCH + patch.layer * 0.002,
      patch.rotationY,
    );
  }
}

function buildWalkways(context: WorldBuildContext): void {
  for (const walkway of WALKWAYS) {
    const isInlay = walkway.id.endsWith('-inlay');
    context.shapes.ground(
      walkway.material,
      walkway.centre,
      walkway.size,
      isInlay ? LAYER_INLAY : LAYER_WALKWAY,
      walkway.rotationY,
    );

    if (!walkway.kerb) {
      continue;
    }

    // Raised whitewashed kerbs along the two long edges. These are not
    // colliders: a 12 cm kerb should never stop the player.
    const [width, depth] = walkway.size;
    const alongZ = depth >= width;
    const kerbThickness = 0.3;

    for (const sign of [-1, 1] as const) {
      const offsetX = alongZ ? (sign * width) / 2 : 0;
      const offsetZ = alongZ ? 0 : (sign * depth) / 2;
      const angle = (walkway.rotationY * Math.PI) / 180;
      const centre = [
        walkway.centre[0] + offsetX * Math.cos(angle) + offsetZ * Math.sin(angle),
        walkway.centre[1] - offsetX * Math.sin(angle) + offsetZ * Math.cos(angle),
      ] as const;

      context.shapes.boxAt(
        'kerb',
        centre,
        LAYER_WALKWAY,
        alongZ ? [kerbThickness, 0.12, depth] : [width, 0.12, kerbThickness],
        walkway.rotationY,
      );
    }
  }
}
