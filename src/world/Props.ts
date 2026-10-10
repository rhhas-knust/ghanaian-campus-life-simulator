/**
 * Street furniture: benches, lamp posts, planters and the courtyard flagpole.
 *
 * Small, repeated objects like these are exactly what the geometry batcher is
 * for — thirteen benches at roughly fourteen boxes each would otherwise be
 * nearly two hundred draw calls on their own.
 */

import { BENCHES, FLAGPOLES, LAMPS, PLANTERS, type BenchDef } from '../config/campusLayout';
import { offsetLocal } from '../utils/shapes';
import type { WorldBuildContext } from './context';

export function buildProps(context: WorldBuildContext): void {
  for (const bench of BENCHES) {
    buildBench(context, bench);
  }
  buildLamps(context);
  buildPlanters(context);
  buildFlagpoles(context);
}

// ---------------------------------------------------------------------------
// Benches
// ---------------------------------------------------------------------------

/**
 * A bench faces its local +Z. Seat slats run along local X, so a bench with
 * `rotationY: 90` seats you looking east.
 */
function buildBench(context: WorldBuildContext, bench: BenchDef): void {
  const { position, rotationY } = bench;
  const seatMaterial = bench.style === 'wood' ? 'woodLight' : 'plinth';
  const frameMaterial = bench.style === 'wood' ? 'metalRail' : 'plinth';
  const length = 1.9;
  const seatHeight = 0.46;

  // Two end frames.
  for (const sign of [-1, 1] as const) {
    const legX = (sign * length) / 2 + sign * -0.14;
    context.shapes.boxAt(
      frameMaterial,
      offsetLocal(position, rotationY, legX, 0),
      0,
      [0.1, seatHeight, 0.52],
      rotationY,
    );
    // Backrest upright.
    context.shapes.boxAt(
      frameMaterial,
      offsetLocal(position, rotationY, legX, -0.22),
      seatHeight,
      [0.09, 0.56, 0.09],
      rotationY,
    );
  }

  // Three seat slats.
  for (let index = 0; index < 3; index += 1) {
    context.shapes.boxAt(
      seatMaterial,
      offsetLocal(position, rotationY, 0, -0.18 + index * 0.17),
      seatHeight,
      [length, 0.07, 0.14],
      rotationY,
    );
  }

  // Two backrest slats.
  for (let index = 0; index < 2; index += 1) {
    context.shapes.boxAt(
      seatMaterial,
      offsetLocal(position, rotationY, 0, -0.26),
      seatHeight + 0.26 + index * 0.21,
      [length, 0.14, 0.07],
      rotationY,
    );
  }

  context.sink.addBoxCollider(`bench:${bench.id}`, position, length / 2 + 0.1, 0.42, rotationY);
}

// ---------------------------------------------------------------------------
// Lamp posts
// ---------------------------------------------------------------------------

function buildLamps(context: WorldBuildContext): void {
  for (const lamp of LAMPS) {
    // Concrete footing.
    context.shapes.boxAt('plinth', lamp.position, 0, [0.5, 0.18, 0.5]);
    context.shapes.cylinder('signPost', {
      at: lamp.position,
      baseY: 0.1,
      radius: 0.09,
      radiusTopRatio: 0.72,
      height: lamp.height,
      segments: 6,
    });
    // Lantern head.
    context.shapes.boxAt('metalRail', lamp.position, lamp.height, [0.42, 0.1, 0.42]);
    context.shapes.boxAt('lampGlass', lamp.position, lamp.height - 0.42, [0.3, 0.42, 0.3]);
    context.shapes.pyramid('metalRail', {
      at: lamp.position,
      baseY: lamp.height + 0.1,
      width: 0.5,
      depth: 0.5,
      height: 0.22,
    });

    context.sink.addCircleCollider(`lamp:${lamp.id}`, lamp.position, 0.3);
  }
}

// ---------------------------------------------------------------------------
// Planters
// ---------------------------------------------------------------------------

function buildPlanters(context: WorldBuildContext): void {
  for (const planter of PLANTERS) {
    const [width, depth] = planter.size;
    const wall = 0.22;

    // Four low walls rather than a solid box, so the planting sits inside.
    for (const sign of [-1, 1] as const) {
      context.shapes.boxAt(
        'wallSandcrete',
        offsetLocal(planter.centre, planter.rotationY, (sign * width) / 2, 0),
        0,
        [wall, planter.height, depth],
        planter.rotationY,
      );
      context.shapes.boxAt(
        'wallSandcrete',
        offsetLocal(planter.centre, planter.rotationY, 0, (sign * depth) / 2),
        0,
        [width, planter.height, wall],
        planter.rotationY,
      );
    }

    // Soil and planting.
    context.shapes.ground(
      'laterite',
      planter.centre,
      [width - wall, depth - wall],
      planter.height * 0.8,
      planter.rotationY,
    );
    context.shapes.blob('hedge', {
      centre: [planter.centre[0], planter.height + 0.3, planter.centre[1]],
      radius: Math.min(width, depth) * 0.42,
      squash: [1.1, 0.6, 1.1],
      rotationY: planter.rotationY,
    });

    context.sink.addBoxCollider(
      `planter:${planter.id}`,
      planter.centre,
      width / 2,
      depth / 2,
      planter.rotationY,
    );
  }
}

// ---------------------------------------------------------------------------
// Flagpole
// ---------------------------------------------------------------------------

function buildFlagpoles(context: WorldBuildContext): void {
  for (const pole of FLAGPOLES) {
    // Stepped concrete base.
    context.shapes.boxAt('plinth', pole.position, 0, [2.6, 0.22, 2.6]);
    context.shapes.boxAt('kerb', pole.position, 0.22, [1.8, 0.2, 1.8]);
    context.shapes.cylinder('fascia', {
      at: pole.position,
      baseY: 0.42,
      radius: 0.09,
      radiusTopRatio: 0.55,
      height: pole.height,
      segments: 8,
    });

    // Ghana flag, flying towards local +X: red over gold over green, with the
    // black star reduced to a small square at this level of detail.
    const flagY = pole.height - 1.9;
    const bands = ['kenteRed', 'kenteGold', 'kenteGreen'] as const;
    bands.forEach((material, index) => {
      context.shapes.boxAt(
        material,
        [pole.position[0] + 1.1, pole.position[1]],
        flagY + (2 - index) * 0.46,
        [2, 0.46, 0.05],
      );
    });
    context.shapes.boxAt(
      'kenteBlack',
      [pole.position[0] + 1.1, pole.position[1]],
      flagY + 0.46,
      [0.34, 0.34, 0.07],
    );

    context.sink.addCircleCollider(`flagpole:${pole.id}`, pole.position, 1.5);
  }
}
