/**
 * Street furniture, from `GAME_ART/props/campus_props_reference.jpeg`:
 * timber-and-concrete benches, single-arm street lamps, concrete bins and
 * bollards — plus the courtyard monument and the cafeteria's patio umbrellas.
 *
 * Small repeated objects are exactly what the geometry batcher is for: these
 * would otherwise be several hundred draw calls on their own.
 */

import {
  BENCHES,
  BINS,
  BOLLARDS,
  LAMPS,
  MONUMENT,
  PATIO_UMBRELLAS,
  planPoint,
  type BenchDef,
  type LampDef,
} from '../config/campusLayout';
import type { Vec2Tuple } from '../types';
import { offsetLocal } from '../utils/shapes';
import type { WorldBuildContext } from './context';

export function buildProps(context: WorldBuildContext): void {
  buildMonument(context);
  for (const bench of BENCHES) {
    buildBench(context, bench);
  }
  for (const lamp of LAMPS) {
    buildLamp(context, lamp);
  }
  for (const [index, at] of BINS.entries()) {
    buildBin(context, `bin-${index}`, planPoint(at));
  }
  for (const [index, at] of BOLLARDS.entries()) {
    buildBollard(context, `bollard-${index}`, planPoint(at));
  }
  for (const [index, at] of PATIO_UMBRELLAS.entries()) {
    buildUmbrella(context, `umbrella-${index}`, planPoint(at));
  }
}

/** Stepped plinth and a stylised figure, as in storyboard frame 3. */
function buildMonument(context: WorldBuildContext): void {
  const { shapes } = context;
  const at = planPoint(MONUMENT.centre);
  const steps = [MONUMENT.baseWidth, MONUMENT.baseWidth * 0.78, MONUMENT.baseWidth * 0.56];
  steps.forEach((width, index) => {
    shapes.boxAt('monumentStone', at, index * 0.38, [width, 0.38, width]);
  });
  const top = steps.length * 0.38;
  shapes.boxAt('monumentStone', at, top, [1.9, 2.6, 1.9]);
  shapes.boxAt('kenteGold', at, top + 1.1, [1.94, 0.5, 1.94]);
  shapes.cylinder('monumentStone', { at, baseY: top + 2.6, radius: 0.55, radiusTopRatio: 0.7, height: 2.6, segments: 10 });
  shapes.blob('monumentStone', { centre: [at[0], top + 5.6, at[1]], radius: 0.42, detail: 1 });
  context.sink.addCircleCollider(MONUMENT.id, at, MONUMENT.baseWidth / 2 + 0.2);
}

/** Concrete end blocks with timber slats. Faces local +Z. */
function buildBench(context: WorldBuildContext, bench: BenchDef): void {
  const { shapes } = context;
  const at = planPoint(bench.at);
  const rotation = bench.rotationY;
  const length = 1.9;
  const seatY = 0.44;

  for (const side of [-1, 1] as const) {
    shapes.boxAt('concrete', offsetLocal(at, rotation, (side * (length - 0.16)) / 2, -0.04), 0, [0.16, 0.86, 0.62], rotation);
  }
  for (let index = 0; index < 3; index += 1) {
    shapes.boxAt('woodWarm', offsetLocal(at, rotation, 0, 0.18 - index * 0.16), seatY, [length - 0.3, 0.06, 0.13], rotation);
  }
  for (let index = 0; index < 3; index += 1) {
    shapes.boxAt('woodWarm', offsetLocal(at, rotation, 0, -0.26), seatY + 0.16 + index * 0.14, [length - 0.3, 0.1, 0.05], rotation);
  }
  context.sink.addBoxCollider(`bench:${bench.id}`, at, length / 2, 0.38, rotation);
}

/** Single-arm street lamp, the arm reaching over the road. */
function buildLamp(context: WorldBuildContext, lamp: LampDef): void {
  const { shapes } = context;
  const at = planPoint(lamp.at);
  shapes.boxAt('concrete', at, 0, [0.42, 0.2, 0.42]);
  shapes.cylinder('metalPole', { at, baseY: 0.2, radius: 0.08, radiusTopRatio: 0.7, height: lamp.height, segments: 6 });

  const reach = 1.3;
  const armAt = offsetLocal(at, lamp.armDegrees, 0, reach / 2);
  shapes.boxAt('metalPole', armAt, lamp.height + 0.1, [0.08, 0.08, reach], lamp.armDegrees);
  const headAt = offsetLocal(at, lamp.armDegrees, 0, reach);
  shapes.boxAt('metalPole', headAt, lamp.height - 0.02, [0.5, 0.14, 0.7], lamp.armDegrees);
  shapes.boxAt('lampGlass', headAt, lamp.height - 0.08, [0.4, 0.06, 0.58], lamp.armDegrees);

  context.sink.addCircleCollider(`lamp:${lamp.id}`, at, 0.28);
}

function buildBin(context: WorldBuildContext, id: string, at: Vec2Tuple): void {
  context.shapes.boxAt('concrete', at, 0, [0.6, 0.95, 0.6]);
  context.shapes.boxAt('fenceMetal', [at[0], at[1] + 0.29], 0.62, [0.36, 0.14, 0.04]);
  context.sink.addCircleCollider(id, at, 0.42);
}

function buildBollard(context: WorldBuildContext, id: string, at: Vec2Tuple): void {
  context.shapes.cylinder('concrete', { at, baseY: 0, radius: 0.18, height: 0.72, segments: 8 });
  context.shapes.blob('concrete', { centre: [at[0], 0.72, at[1]], radius: 0.18, squash: [1, 0.7, 1] });
  context.sink.addCircleCollider(id, at, 0.24);
}

/** Patio umbrella over a round table. */
function buildUmbrella(context: WorldBuildContext, id: string, at: Vec2Tuple): void {
  const { shapes } = context;
  shapes.cylinder('woodWarm', { at, baseY: 0.72, radius: 0.62, height: 0.06, segments: 12 });
  shapes.cylinder('metalPole', { at, baseY: 0, radius: 0.04, height: 2.4, segments: 6 });
  shapes.cylinder('canvasWhite', { at, baseY: 2.05, radius: 1.45, radiusTopRatio: 0, height: 0.55, segments: 8 });
  for (const side of [-1, 1] as const) {
    shapes.boxAt('metalPole', [at[0] + side * 0.95, at[1]], 0, [0.42, 0.46, 0.42]);
  }
  context.sink.addCircleCollider(id, at, 0.75);
}
