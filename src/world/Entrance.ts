/**
 * Perimeter fence and the security gate.
 *
 * The fence follows the master plan: a low rendered wall with dark railings and
 * a pillar every fifteen metres. The gate is the security booth on its traffic
 * island (the booth itself is a building in the layout data) with two red and
 * white barrier arms — raised, because the gate is open during the day, which
 * is also why the arms have no collider.
 */

import { FENCE, GATE_BARRIERS, planPoint, type FenceDef } from '../config/campusLayout';
import type { MaterialKey } from '../config/palette';
import type { Vec2Tuple } from '../types';
import { offsetLocal } from '../utils/shapes';
import type { WorldBuildContext } from './context';

const WALL_HEIGHT = 0.6;
const RAIL_TOP = 2;
const POST_PITCH = 3;
const PILLAR_PITCH = 15;

export function buildEntrance(context: WorldBuildContext): void {
  for (const segment of FENCE) {
    buildFence(context, segment);
  }
  buildGate(context);
}

function buildFence(context: WorldBuildContext, segment: FenceDef): void {
  const { shapes } = context;
  const from = planPoint(segment.from);
  const to = planPoint(segment.to);
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  if (length < 0.5) {
    return;
  }
  const centre: Vec2Tuple = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  // Local +Z runs from `from` to `to`.
  const rotationY = (Math.atan2(dx, dz) * 180) / Math.PI;

  shapes.boxAt('wallCream', centre, 0, [0.32, WALL_HEIGHT, length], rotationY);
  shapes.boxAt('column', centre, WALL_HEIGHT, [0.4, 0.08, length], rotationY);
  for (const railY of [1.25, RAIL_TOP - 0.06]) {
    shapes.boxAt('fenceMetal', centre, railY, [0.05, 0.06, length], rotationY);
  }

  const posts = Math.floor(length / POST_PITCH);
  for (let index = 0; index <= posts; index += 1) {
    const along = -length / 2 + (index / Math.max(posts, 1)) * length;
    shapes.boxAt('fenceMetal', offsetLocal(centre, rotationY, 0, along), WALL_HEIGHT, [0.06, RAIL_TOP - WALL_HEIGHT, 0.06], rotationY);
  }
  const pillars = Math.max(1, Math.round(length / PILLAR_PITCH));
  for (let index = 0; index <= pillars; index += 1) {
    const along = -length / 2 + (index / pillars) * length;
    const at = offsetLocal(centre, rotationY, 0, along);
    shapes.boxAt('wallCream', at, 0, [0.55, RAIL_TOP + 0.15, 0.55], rotationY);
    shapes.boxAt('column', at, RAIL_TOP + 0.15, [0.68, 0.12, 0.68], rotationY);
  }

  context.sink.addBoxCollider(`fence:${segment.id}`, centre, 0.4, length / 2, rotationY);
}

function buildGate(context: WorldBuildContext): void {
  const { shapes } = context;
  const booth = planPoint(GATE_BARRIERS.booth);

  // Traffic island the booth stands on.
  shapes.boxAt('kerb', booth, 0, [3.6, 0.18, 13.2]);
  context.sink.addBoxCollider('gate-island', booth, 1.9, 6.7, 0);

  // Barrier arms either side of the booth, raised.
  const tilt = -GATE_BARRIERS.raisedDegrees;
  const pieces = 4;
  for (const side of [-1, 1] as const) {
    const pivot: Vec2Tuple = [booth[0] + side * 1.9, booth[1]];
    shapes.boxAt('concrete', pivot, 0, [0.4, 1.1, 0.4]);
    // Arm direction in world space: out over the lane, then tipped up.
    const radians = (GATE_BARRIERS.raisedDegrees * Math.PI) / 180;
    const dirX = side * Math.cos(radians);
    const dirY = Math.sin(radians);
    const pieceLength = GATE_BARRIERS.armLength / pieces;
    for (let index = 0; index < pieces; index += 1) {
      const distance = pieceLength * (index + 0.5);
      const material: MaterialKey = index % 2 === 0 ? 'barrierStripe' : 'canvasWhite';
      shapes.tiltedBox(
        material,
        [pivot[0] + dirX * distance, 1 + dirY * distance, pivot[1]],
        [0.1, 0.12, pieceLength],
        side * 90,
        tilt,
      );
    }
  }
}
