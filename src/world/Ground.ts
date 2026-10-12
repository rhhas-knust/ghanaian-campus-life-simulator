/**
 * Ground: lawns, roads, footpaths, car parks and the sports pitches.
 *
 * Everything here is a flat quad or disc — two triangles, or forty for a disc —
 * stacked in thin layers so later layers paint over earlier ones. That is far
 * cheaper than a terrain mesh, and the campus is flat in Phase 1.
 *
 *   0.00  lawn, everywhere
 *   0.02  layer 1: roads, car parks
 *   0.04  layer 2: footpaths
 *   0.06  layer 3: plaza, patio, pitch surfaces
 *   0.08  layer 4: white markings
 *
 * The layers are 2 cm apart rather than 1 because depth precision on mobile
 * GPUs falls off with distance; at 1 cm, far-away paths shimmer.
 */

import {
  BASKETBALL_COURT,
  CAMPUS_BOUNDS,
  CAR_PARKS,
  FOOTBALL_FIELD,
  PATHS,
  ROADS,
  ROAD_DISCS,
  planLength,
  planPoint,
  planRect,
  type CarParkDef,
  type PlanRect,
  type SurfaceRectDef,
} from '../config/campusLayout';
import type { MaterialKey } from '../config/palette';
import type { Vec2Tuple } from '../types';
import { SeededRandom } from '../utils/Random';
import type { WorldBuildContext } from './context';

const LAYER_Y = [0, 0.02, 0.04, 0.06, 0.08] as const;
const LINE_WIDTH = 0.14;

export function buildGround(context: WorldBuildContext): void {
  buildLawn(context);

  for (const surface of [...ROADS, ...PATHS]) {
    buildSurface(context, surface);
  }
  for (const disc of ROAD_DISCS) {
    context.shapes.disc(disc.material, planPoint(disc.centre), planLength(disc.radiusPx), LAYER_Y[disc.layer]);
  }
  for (const carPark of CAR_PARKS) {
    buildCarPark(context, carPark);
  }

  buildFootballField(context);
  buildBasketballCourt(context);
}

/** One quad of grass under everything, extending well past the fence. */
function buildLawn(context: WorldBuildContext): void {
  const width = CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX + 160;
  const depth = CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ + 160;
  const centre: Vec2Tuple = [
    (CAMPUS_BOUNDS.maxX + CAMPUS_BOUNDS.minX) / 2,
    (CAMPUS_BOUNDS.maxZ + CAMPUS_BOUNDS.minZ) / 2,
  ];
  context.shapes.ground('lawn', centre, [width, depth], 0);
}

function buildSurface(context: WorldBuildContext, surface: SurfaceRectDef): void {
  const { centre, size } = planRect(surface.rect);
  context.shapes.ground(surface.material, centre, size, LAYER_Y[surface.layer]);

  if (surface.centreLine) {
    dashedLine(context, centre, size);
  }
}

/** White dashes down the middle of a road, along its long axis. */
function dashedLine(context: WorldBuildContext, centre: Vec2Tuple, size: readonly [number, number]): void {
  const alongX = size[0] >= size[1];
  const length = alongX ? size[0] : size[1];
  const dash = 2.6;
  const pitch = 6;
  const count = Math.floor(length / pitch);
  for (let index = 0; index < count; index += 1) {
    const offset = -length / 2 + pitch / 2 + index * pitch;
    const at: Vec2Tuple = alongX ? [centre[0] + offset, centre[1]] : [centre[0], centre[1] + offset];
    context.shapes.ground('roadMarking', at, alongX ? [dash, LINE_WIDTH] : [LINE_WIDTH, dash], LAYER_Y[4]);
  }
}

/** Straight white line between two world points. */
function line(context: WorldBuildContext, from: Vec2Tuple, to: Vec2Tuple, material: MaterialKey = 'roadMarking'): void {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const rotationY = (Math.atan2(dx, dz) * 180) / Math.PI;
  context.shapes.ground(material, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2], [LINE_WIDTH, length], LAYER_Y[4], rotationY);
}

/** Rectangle outline from a plan rect. */
function outline(context: WorldBuildContext, rect: PlanRect): void {
  const [x0, z0] = planPoint([rect[0], rect[1]]);
  const [x1, z1] = planPoint([rect[2], rect[3]]);
  line(context, [x0, z0], [x1, z0]);
  line(context, [x1, z0], [x1, z1]);
  line(context, [x1, z1], [x0, z1]);
  line(context, [x0, z1], [x0, z0]);
}

/** Circle drawn as short segments; a white disc would cover the pitch stripes. */
function circleLine(context: WorldBuildContext, centre: Vec2Tuple, radius: number, segments = 24): void {
  for (let index = 0; index < segments; index += 1) {
    const a0 = (index / segments) * Math.PI * 2;
    const a1 = ((index + 1) / segments) * Math.PI * 2;
    line(
      context,
      [centre[0] + Math.cos(a0) * radius, centre[1] + Math.sin(a0) * radius],
      [centre[0] + Math.cos(a1) * radius, centre[1] + Math.sin(a1) * radius],
    );
  }
}

// ---------------------------------------------------------------------------
// Car parks
// ---------------------------------------------------------------------------

function buildCarPark(context: WorldBuildContext, carPark: CarParkDef): void {
  const { centre, size } = planRect(carPark.rect);
  const [width, depth] = size;
  context.shapes.ground('asphalt', centre, size, LAYER_Y[1]);

  // Bays repeat along one axis; their lines are parallel to the other.
  const repeatsAlongZ = carPark.bayLines === 'x';
  const runLength = repeatsAlongZ ? depth : width;
  const bayDepthAxis = repeatsAlongZ ? width : depth;
  const pitch = planLength(carPark.bayPx);
  const bays = Math.floor(runLength / pitch);
  const rows = carPark.doubleRow ? [-1, 1] : [0];
  const rowDepth = carPark.doubleRow ? bayDepthAxis * 0.38 : bayDepthAxis * 0.8;

  const bayCentres: { at: Vec2Tuple; facing: number }[] = [];

  for (const row of rows) {
    // Centre of this row of bays across the bay-depth axis.
    const rowOffset = row === 0 ? 0 : row * (bayDepthAxis / 2 - rowDepth / 2);
    for (let index = 0; index <= bays; index += 1) {
      const along = -runLength / 2 + (runLength - bays * pitch) / 2 + index * pitch;
      const lineCentre: Vec2Tuple = repeatsAlongZ
        ? [centre[0] + rowOffset, centre[1] + along]
        : [centre[0] + along, centre[1] + rowOffset];
      context.shapes.ground(
        'roadMarking',
        lineCentre,
        repeatsAlongZ ? [rowDepth, LINE_WIDTH] : [LINE_WIDTH, rowDepth],
        LAYER_Y[4],
      );
      if (index < bays) {
        const bayAt: Vec2Tuple = repeatsAlongZ
          ? [lineCentre[0], lineCentre[1] + pitch / 2]
          : [lineCentre[0] + pitch / 2, lineCentre[1]];
        // Nose-in towards the aisle.
        const facing = repeatsAlongZ ? (row >= 0 ? -90 : 90) : row >= 0 ? 180 : 0;
        bayCentres.push({ at: bayAt, facing });
      }
    }
  }

  // Seeded so every device parks the same cars in the same bays.
  const random = new SeededRandom(carPark.seed);
  const colours: MaterialKey[] = ['carRed', 'carSilver', 'carBlue', 'carSilver'];
  const taken = new Set<number>();
  for (let car = 0; car < Math.min(carPark.cars, bayCentres.length); car += 1) {
    let index = random.int(bayCentres.length);
    while (taken.has(index)) {
      index = (index + 1) % bayCentres.length;
    }
    taken.add(index);
    const bay = bayCentres[index];
    if (bay) {
      parkedCar(context, `${carPark.id}-${index}`, bay.at, bay.facing, random.pick(colours));
    }
  }
}

function parkedCar(context: WorldBuildContext, id: string, at: Vec2Tuple, rotationY: number, paint: MaterialKey): void {
  const { shapes } = context;
  shapes.boxAt(paint, at, 0.28, [1.8, 0.72, 4.2], rotationY);
  shapes.boxAt('glass', at, 0.98, [1.6, 0.56, 2.2], rotationY);
  shapes.boxAt('fenceMetal', at, 0.05, [1.7, 0.3, 3.6], rotationY);
  context.sink.addBoxCollider(`car:${id}`, at, 0.95, 2.15, rotationY);
}

// ---------------------------------------------------------------------------
// Sports
// ---------------------------------------------------------------------------

function buildFootballField(context: WorldBuildContext): void {
  const { shapes } = context;
  const surround = planRect(FOOTBALL_FIELD.surround);
  shapes.ground('pavingTan', surround.centre, surround.size, LAYER_Y[2]);

  const pitch = planRect(FOOTBALL_FIELD.pitch);
  const [width, depth] = pitch.size;
  // Mown stripes across the pitch.
  const stripes = 12;
  for (let index = 0; index < stripes; index += 1) {
    const x = pitch.centre[0] - width / 2 + (index + 0.5) * (width / stripes);
    shapes.ground(index % 2 === 0 ? 'lawn' : 'lawnStripe', [x, pitch.centre[1]], [width / stripes, depth], LAYER_Y[3]);
  }

  outline(context, FOOTBALL_FIELD.pitch);
  const [cx, cz] = pitch.centre;
  line(context, [cx, cz - depth / 2], [cx, cz + depth / 2]);
  circleLine(context, pitch.centre, 6);

  for (const side of [-1, 1] as const) {
    const goalLineX = cx + (side * width) / 2;
    const boxDepth = 9;
    const boxHalfWidth = 13;
    const inner = goalLineX - side * boxDepth;
    line(context, [goalLineX, cz - boxHalfWidth], [inner, cz - boxHalfWidth]);
    line(context, [inner, cz - boxHalfWidth], [inner, cz + boxHalfWidth]);
    line(context, [inner, cz + boxHalfWidth], [goalLineX, cz + boxHalfWidth]);

    // Goal: two posts and a crossbar, just behind the line.
    for (const post of [-1, 1] as const) {
      const at: Vec2Tuple = [goalLineX + side * 0.6, cz + post * 3.66];
      shapes.boxAt('canvasWhite', at, 0, [0.12, 2.44, 0.12]);
      context.sink.addCircleCollider(`goal-post:${side}:${post}`, at, 0.2);
    }
    shapes.boxAt('canvasWhite', [goalLineX + side * 0.6, cz], 2.38, [0.12, 0.12, 7.44]);
    shapes.boxAt('fenceMetal', [goalLineX + side * 1.8, cz], 0, [0.06, 2.2, 7.3]);
  }
}

function buildBasketballCourt(context: WorldBuildContext): void {
  const { shapes } = context;
  const court = planRect(BASKETBALL_COURT.court);
  const [width, depth] = court.size;
  shapes.ground('courtSurface', court.centre, court.size, LAYER_Y[3]);
  outline(context, BASKETBALL_COURT.court);

  const [cx, cz] = court.centre;
  line(context, [cx - width / 2, cz], [cx + width / 2, cz]);
  circleLine(context, court.centre, 1.8, 18);

  for (const side of [-1, 1] as const) {
    const baselineZ = cz + (side * depth) / 2;
    const keyDepth = 5.8;
    const keyHalf = 2.45;
    const freeThrow = baselineZ - side * keyDepth;
    line(context, [cx - keyHalf, baselineZ], [cx - keyHalf, freeThrow]);
    line(context, [cx + keyHalf, baselineZ], [cx + keyHalf, freeThrow]);
    line(context, [cx - keyHalf, freeThrow], [cx + keyHalf, freeThrow]);

    // Hoop: pole behind the baseline, backboard and rim over the key.
    const poleAt: Vec2Tuple = [cx, baselineZ + side * 0.9];
    shapes.cylinder('metalPole', { at: poleAt, baseY: 0, radius: 0.1, height: 3.4, segments: 8 });
    shapes.boxAt('metalPole', [cx, baselineZ + side * 0.45], 3.2, [0.1, 0.1, 0.9]);
    shapes.boxAt('canvasWhite', [cx, baselineZ], 2.9, [1.8, 1.05, 0.06]);
    shapes.boxAt('barrierStripe', [cx, baselineZ - side * 0.3], 3.05, [0.46, 0.04, 0.46]);
    context.sink.addCircleCollider(`hoop:${side}`, poleAt, 0.3);
  }
}
