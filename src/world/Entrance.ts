/**
 * Campus entrance and boundary wall.
 *
 * The gate is the first thing the player sees, so it carries most of the
 * "where am I?" load: two rendered pillars with pyramid caps, a whitewashed
 * lintel across the top, and a kente band under it in the national colours.
 */

import { BOUNDARY_WALLS, GATE, type WallSegmentDef } from '../config/campusLayout';
import type { Vec2Tuple } from '../types';
import { offsetLocal } from '../utils/shapes';
import type { WorldBuildContext } from './context';

export function buildEntrance(context: WorldBuildContext): void {
  buildGate(context);
  for (const wall of BOUNDARY_WALLS) {
    buildWallSegment(context, wall);
  }
}

function buildGate(context: WorldBuildContext): void {
  const gate = GATE;
  const halfOpening = gate.openingWidth / 2;
  const pillarOffset = halfOpening + gate.pillarWidth / 2;

  for (const sign of [-1, 1] as const) {
    const pillarCentre = offsetLocal(gate.centre, gate.rotationY, sign * pillarOffset, 0);

    // Wider base course.
    context.shapes.boxAt(
      'plinth',
      pillarCentre,
      0,
      [gate.pillarWidth + 0.5, 0.5, gate.pillarWidth + 0.5],
      gate.rotationY,
    );
    context.shapes.boxAt(
      gate.pillarMaterial,
      pillarCentre,
      0.5,
      [gate.pillarWidth, gate.pillarHeight - 0.5, gate.pillarWidth],
      gate.rotationY,
    );
    // Whitewashed banding and a pyramid cap.
    context.shapes.boxAt(
      'wallWhitewash',
      pillarCentre,
      gate.pillarHeight - 0.1,
      [gate.pillarWidth + 0.3, 0.34, gate.pillarWidth + 0.3],
      gate.rotationY,
    );
    context.shapes.pyramid(gate.archMaterial, {
      at: pillarCentre,
      baseY: gate.pillarHeight + 0.24,
      width: gate.pillarWidth + 0.3,
      depth: gate.pillarWidth + 0.3,
      height: 0.8,
      rotationY: gate.rotationY,
    });

    context.sink.addBoxCollider(
      `gate-pillar:${sign > 0 ? 'east' : 'west'}`,
      pillarCentre,
      (gate.pillarWidth + 0.5) / 2,
      (gate.pillarWidth + 0.5) / 2,
      gate.rotationY,
    );
  }

  // Lintel spanning the opening, with the name board and a kente band under it.
  const lintelWidth = gate.openingWidth + gate.pillarWidth * 2;
  context.shapes.boxAt(
    gate.archMaterial,
    gate.centre,
    gate.archHeight,
    [lintelWidth, 1.3, gate.archThickness],
    gate.rotationY,
  );
  context.shapes.boxAt(
    'signBoard',
    offsetLocal(gate.centre, gate.rotationY, 0, gate.archThickness / 2 + 0.03),
    gate.archHeight + 0.18,
    [lintelWidth * 0.76, 0.86, 0.08],
    gate.rotationY,
  );

  const bands = ['kenteRed', 'kenteGold', 'kenteGreen'] as const;
  bands.forEach((material, index) => {
    context.shapes.boxAt(
      material,
      gate.centre,
      gate.archHeight - 0.18 - index * 0.06,
      [lintelWidth, 0.06, gate.archThickness + 0.1],
      gate.rotationY,
    );
  });

  // Side walls returning from each pillar towards the boundary.
  for (const sign of [-1, 1] as const) {
    const returnCentre = offsetLocal(
      gate.centre,
      gate.rotationY,
      sign * (pillarOffset + 1.6),
      0,
    );
    context.shapes.boxAt(
      gate.pillarMaterial,
      returnCentre,
      0,
      [2.6, 2.6, gate.pillarWidth * 0.7],
      gate.rotationY,
    );
    context.sink.addBoxCollider(
      `gate-return:${sign > 0 ? 'east' : 'west'}`,
      returnCentre,
      1.3,
      (gate.pillarWidth * 0.7) / 2,
      gate.rotationY,
    );
  }
}

function buildWallSegment(context: WorldBuildContext, wall: WallSegmentDef): void {
  const dx = wall.to[0] - wall.from[0];
  const dz = wall.to[1] - wall.from[1];
  const length = Math.hypot(dx, dz);
  if (length < 0.1) {
    return;
  }

  const centre: Vec2Tuple = [(wall.from[0] + wall.to[0]) / 2, (wall.from[1] + wall.to[1]) / 2];
  // Rotate so local +Z runs from `from` to `to`.
  const rotationY = (Math.atan2(dx, dz) * 180) / Math.PI;

  context.shapes.boxAt(
    wall.material,
    centre,
    0,
    [wall.thickness, wall.height, length],
    rotationY,
  );
  // Coping along the top.
  context.shapes.boxAt(
    'wallWhitewash',
    centre,
    wall.height,
    [wall.thickness + 0.16, 0.16, length],
    rotationY,
  );

  if (wall.pillarEvery > 0) {
    const pillarCount = Math.max(2, Math.round(length / wall.pillarEvery));
    for (let index = 0; index <= pillarCount; index += 1) {
      const t = index / pillarCount;
      const along = -length / 2 + t * length;
      const pillarCentre = offsetLocal(centre, rotationY, 0, along);
      context.shapes.boxAt(
        'wallWhitewash',
        pillarCentre,
        0,
        [wall.thickness + 0.3, wall.height + 0.35, wall.thickness + 0.3],
        rotationY,
      );
    }
  }

  context.sink.addBoxCollider(
    `wall:${wall.id}`,
    centre,
    wall.thickness / 2 + 0.2,
    length / 2,
    rotationY,
  );
}
