/**
 * Building generator.
 *
 * Reads `BUILDINGS` from the campus layout and produces placeholder geometry in
 * a recognisably Ghanaian institutional idiom:
 *
 *  - A raised concrete plinth with a step, because the rains come hard and the
 *    ground floor has to sit above the splash line.
 *  - Deep verandah colonnades with balcony slabs and railings, so every room
 *    opens to the outside air instead of an internal corridor.
 *  - Wide overhanging eaves on a steep gable or hip roof, in red oxide or zinc.
 *  - Louvred breeze-block screens on the gable ends for cross-ventilation.
 *  - Optional painted kente band between the storeys.
 *
 * None of these proportions are hard-coded here: they all derive from the
 * building's own data entry, so moving or resizing a block in
 * `campusLayout.ts` reshapes everything, including its collider and plaque.
 */

import { Vector3 } from 'three';

import { BUILDINGS, type BuildingDef, type VerandahStyle } from '../config/campusLayout';
import { offsetLocal } from '../utils/shapes';
import type { WorldBuildContext } from './context';

/** Depth of the shaded verandah, in metres. */
const VERANDAH_DEPTH = 2.6;
/** How far the roof oversails the walls. */
const EAVE_OVERHANG = 1.1;
const PLINTH_HEIGHT = 0.45;
const PLINTH_MARGIN = 0.7;
const COLUMN_SIDE = 0.34;

export function buildBuildings(context: WorldBuildContext): void {
  for (const building of BUILDINGS) {
    if (building.model !== null) {
      // A real model has been supplied for this building; `ModelLoader` (Phase 2)
      // takes over and the placeholder is skipped entirely. The collider and
      // plaque below still apply, so navigation keeps working either way.
      registerFootprint(context, building);
      registerPlaque(context, building);
      continue;
    }

    buildPlinth(context, building);
    buildWalls(context, building);
    buildWindows(context, building);
    buildVerandahs(context, building);
    buildEntrance(context, building);
    buildRoof(context, building);
    registerFootprint(context, building);
    registerPlaque(context, building);
  }
}

// ---------------------------------------------------------------------------
// Mass
// ---------------------------------------------------------------------------

function buildPlinth(context: WorldBuildContext, building: BuildingDef): void {
  const [width, , depth] = building.size;
  const { position, rotationY } = building;
  const skirt = verandahPadding(building.verandah);

  context.shapes.boxAt(
    'plinth',
    offsetLocal(position, rotationY, 0, skirt.offsetZ),
    0,
    [width + PLINTH_MARGIN * 2 + skirt.extraX * 2, PLINTH_HEIGHT, depth + PLINTH_MARGIN * 2 + skirt.extraZ],
    rotationY,
  );

  // A single step across the whole frontage.
  const frontZ = depth / 2 + skirt.front + PLINTH_MARGIN;
  context.shapes.boxAt(
    'kerb',
    offsetLocal(position, rotationY, 0, frontZ + 0.45),
    0,
    [Math.min(width, 12), PLINTH_HEIGHT * 0.55, 0.9],
    rotationY,
  );
}

function buildWalls(context: WorldBuildContext, building: BuildingDef): void {
  const [width, height, depth] = building.size;
  const { position, rotationY } = building;

  context.shapes.boxAt(building.walls, position, PLINTH_HEIGHT, [width, height, depth], rotationY);

  // Whitewashed corner pilasters — a very common detail, and they stop the long
  // flat walls of the placeholder reading as a plain shipping container.
  for (const signX of [-1, 1] as const) {
    for (const signZ of [-1, 1] as const) {
      context.shapes.boxAt(
        building.trim,
        offsetLocal(position, rotationY, (signX * width) / 2, (signZ * depth) / 2),
        PLINTH_HEIGHT,
        [0.7, height + 0.15, 0.7],
        rotationY,
      );
    }
  }

  if (building.kenteBand) {
    buildKenteBand(context, building);
  }

  // Louvred breeze-block screens high on the two gable ends.
  const screenY = PLINTH_HEIGHT + height * 0.76;
  const screenHeight = Math.min(1.6, height * 0.16);
  for (const signX of [-1, 1] as const) {
    context.shapes.boxAt(
      'breezeBlock',
      offsetLocal(position, rotationY, (signX * width) / 2 + signX * 0.05, 0),
      screenY,
      [0.2, screenHeight, depth * 0.55],
      rotationY,
    );
  }
}

/** Red / gold / green stripe wrapped round the building between storeys. */
function buildKenteBand(context: WorldBuildContext, building: BuildingDef): void {
  const [width, height, depth] = building.size;
  const { position, rotationY } = building;
  const bandY = PLINTH_HEIGHT + height * 0.52;
  const stripe = 0.16;
  const stripes = ['kenteGreen', 'kenteGold', 'kenteRed'] as const;

  stripes.forEach((material, index) => {
    context.shapes.boxAt(
      material,
      position,
      bandY + index * stripe,
      [width + 0.16, stripe, depth + 0.16],
      rotationY,
    );
  });
}

// ---------------------------------------------------------------------------
// Openings
// ---------------------------------------------------------------------------

function buildWindows(context: WorldBuildContext, building: BuildingDef): void {
  const [width, height, depth] = building.size;
  const storeyHeight = height / building.storeys;

  for (let storey = 0; storey < building.storeys; storey += 1) {
    const sillY = PLINTH_HEIGHT + storey * storeyHeight + storeyHeight * 0.32;
    const windowHeight = storeyHeight * 0.42;

    placeWindowRun(context, building, {
      axisLength: width,
      faceOffset: depth / 2,
      alongX: true,
      sillY,
      windowHeight,
    });
    placeWindowRun(context, building, {
      axisLength: width,
      faceOffset: -depth / 2,
      alongX: true,
      sillY,
      windowHeight,
    });
    placeWindowRun(context, building, {
      axisLength: depth,
      faceOffset: width / 2,
      alongX: false,
      sillY,
      windowHeight,
    });
    placeWindowRun(context, building, {
      axisLength: depth,
      faceOffset: -width / 2,
      alongX: false,
      sillY,
      windowHeight,
    });
  }
}

interface WindowRun {
  /** Length of the wall the windows run along. */
  readonly axisLength: number;
  /** Signed distance from the building centre out to the face. */
  readonly faceOffset: number;
  /** True when the run travels along the local X axis. */
  readonly alongX: boolean;
  readonly sillY: number;
  readonly windowHeight: number;
}

function placeWindowRun(
  context: WorldBuildContext,
  building: BuildingDef,
  run: WindowRun,
): void {
  const { position, rotationY } = building;
  const spacing = 3.1;
  const windowWidth = 1.7;
  const count = Math.max(1, Math.floor((run.axisLength - 2.4) / spacing));
  const span = (count - 1) * spacing;

  // Which way is "out of the wall" for this run: +1 or -1 along the face axis.
  const outward = Math.sign(run.faceOffset) || 1;
  const trimDepth = 0.3;
  const glassDepth = 0.14;
  // Sit the glass just proud of the surround. A genuinely recessed pane would
  // need a four-bar frame per window, which across seven buildings is over a
  // thousand extra boxes for a detail nobody can see from the courtyard.
  const glassOut = run.faceOffset + outward * (trimDepth / 2);
  const shutterOffset = windowWidth * 0.62 + 0.26;

  for (let index = 0; index < count; index += 1) {
    const along = -span / 2 + index * spacing;

    const atFace = (offset: number, slide = 0): readonly [number, number] =>
      run.alongX ? [along + slide, offset] : [offset, along + slide];

    const trimSize: [number, number] = run.alongX
      ? [windowWidth + 0.34, trimDepth]
      : [trimDepth, windowWidth + 0.34];
    const glassSize: [number, number] = run.alongX
      ? [windowWidth, glassDepth]
      : [glassDepth, windowWidth];
    const shutterSize: [number, number] = run.alongX ? [0.5, 0.16] : [0.16, 0.5];

    const [trimX, trimZ] = atFace(run.faceOffset);
    const [glassX, glassZ] = atFace(glassOut);

    // Painted surround, then the pane standing proud of it.
    context.shapes.boxAt(
      building.trim,
      offsetLocal(position, rotationY, trimX, trimZ),
      run.sillY - 0.16,
      [trimSize[0], run.windowHeight + 0.42, trimSize[1]],
      rotationY,
    );
    context.shapes.boxAt(
      'glass',
      offsetLocal(position, rotationY, glassX, glassZ),
      run.sillY,
      [glassSize[0], run.windowHeight, glassSize[1]],
      rotationY,
    );

    // Louvred shutters thrown open against the wall, one either side.
    for (const side of [-1, 1] as const) {
      const [shutterX, shutterZ] = atFace(glassOut, side * shutterOffset);
      context.shapes.boxAt(
        'shutterGreen',
        offsetLocal(position, rotationY, shutterX, shutterZ),
        run.sillY,
        [shutterSize[0], run.windowHeight, shutterSize[1]],
        rotationY,
      );
    }
  }
}

function buildEntrance(context: WorldBuildContext, building: BuildingDef): void {
  const [, height, depth] = building.size;
  const { position, rotationY } = building;
  const doorHeight = Math.min(2.6, height * 0.42);
  const frontZ = depth / 2 + 0.06;

  context.shapes.boxAt(
    building.trim,
    offsetLocal(position, rotationY, 0, frontZ),
    PLINTH_HEIGHT,
    [3.4, doorHeight + 0.5, 0.3],
    rotationY,
  );
  context.shapes.boxAt(
    'doorWood',
    offsetLocal(position, rotationY, 0, frontZ + 0.1),
    PLINTH_HEIGHT,
    [2.6, doorHeight, 0.18],
    rotationY,
  );
}

// ---------------------------------------------------------------------------
// Verandahs
// ---------------------------------------------------------------------------

function buildVerandahs(context: WorldBuildContext, building: BuildingDef): void {
  switch (building.verandah) {
    case 'none':
      return;
    case 'front':
      buildVerandahSide(context, building, 'front');
      return;
    case 'front-and-back':
      buildVerandahSide(context, building, 'front');
      buildVerandahSide(context, building, 'back');
      return;
    case 'wrap':
      buildVerandahSide(context, building, 'front');
      buildVerandahSide(context, building, 'back');
      buildVerandahSide(context, building, 'left');
      buildVerandahSide(context, building, 'right');
      return;
  }
}

type VerandahSide = 'front' | 'back' | 'left' | 'right';

function buildVerandahSide(
  context: WorldBuildContext,
  building: BuildingDef,
  side: VerandahSide,
): void {
  const [width, height, depth] = building.size;
  const { position, rotationY, storeys } = building;

  const alongX = side === 'front' || side === 'back';
  const runLength = alongX ? width : depth;
  const faceDistance = (alongX ? depth : width) / 2;
  const sign = side === 'front' || side === 'right' ? 1 : -1;
  const centreOut = sign * (faceDistance + VERANDAH_DEPTH / 2);

  const toLocal = (along: number, out: number): readonly [number, number] =>
    alongX ? [along, out] : [out, along];

  // Slab at ground level, plus one balcony slab per upper storey.
  const storeyHeight = height / storeys;
  for (let level = 0; level < storeys; level += 1) {
    const slabY = PLINTH_HEIGHT + level * storeyHeight - (level === 0 ? 0.12 : 0.14);
    const [lx, lz] = toLocal(0, centreOut);
    context.shapes.boxAt(
      level === 0 ? 'plinth' : building.trim,
      offsetLocal(position, rotationY, lx, lz),
      slabY,
      alongX
        ? [runLength + 0.4, 0.14, VERANDAH_DEPTH]
        : [VERANDAH_DEPTH, 0.14, runLength + 0.4],
      rotationY,
    );

    if (level > 0) {
      // Balcony railing along the outer edge.
      const railOut = sign * (faceDistance + VERANDAH_DEPTH - 0.12);
      const [rx, rz] = toLocal(0, railOut);
      context.shapes.boxAt(
        'metalRail',
        offsetLocal(position, rotationY, rx, rz),
        slabY + 0.14,
        alongX ? [runLength + 0.4, 1, 0.1] : [0.1, 1, runLength + 0.4],
        rotationY,
      );
    }
  }

  // Colonnade. One column roughly every 3.4 m, never fewer than three.
  const columnCount = Math.max(3, Math.round(runLength / 3.4) + 1);
  const columnSpan = runLength - 0.6;
  const columnOut = sign * (faceDistance + VERANDAH_DEPTH - 0.3);

  for (let index = 0; index < columnCount; index += 1) {
    const t = columnCount === 1 ? 0.5 : index / (columnCount - 1);
    const along = -columnSpan / 2 + t * columnSpan;
    const [cx, cz] = toLocal(along, columnOut);
    const columnCentre = offsetLocal(position, rotationY, cx, cz);

    context.shapes.boxAt(
      building.trim,
      columnCentre,
      PLINTH_HEIGHT,
      [COLUMN_SIDE, height, COLUMN_SIDE],
      rotationY,
    );
    // Capital, so the colonnade reads as architecture rather than scaffolding.
    context.shapes.boxAt(
      building.trim,
      columnCentre,
      PLINTH_HEIGHT + height - 0.3,
      [COLUMN_SIDE + 0.18, 0.3, COLUMN_SIDE + 0.18],
      rotationY,
    );
  }

  // Beam carrying the roof overhang above the colonnade.
  const [bx, bz] = toLocal(0, columnOut);
  context.shapes.boxAt(
    building.trim,
    offsetLocal(position, rotationY, bx, bz),
    PLINTH_HEIGHT + height - 0.02,
    alongX ? [runLength + 0.5, 0.34, 0.42] : [0.42, 0.34, runLength + 0.5],
    rotationY,
  );
}

// ---------------------------------------------------------------------------
// Roofs
// ---------------------------------------------------------------------------

function buildRoof(context: WorldBuildContext, building: BuildingDef): void {
  const [width, height, depth] = building.size;
  const { position, rotationY } = building;
  const padding = verandahPadding(building.verandah);

  const roofWidth = width + padding.extraX * 2 + EAVE_OVERHANG * 2;
  const roofDepth = depth + padding.extraZ + EAVE_OVERHANG * 2;
  const roofCentre = offsetLocal(position, rotationY, 0, padding.offsetZ);
  const eavesY = PLINTH_HEIGHT + height + 0.3;

  // Fascia board band at the eaves line, sitting just under the roof.
  context.shapes.boxAt(
    'fascia',
    roofCentre,
    eavesY - 0.3,
    [roofWidth, 0.3, roofDepth],
    rotationY,
  );

  switch (building.roofStyle) {
    case 'gable': {
      // The prism's ridge runs along its local Z, so rotate a further 90 degrees
      // when the building is wider than it is deep — a ridge always wants to run
      // along the longer axis.
      const ridgeAlongX = roofWidth >= roofDepth;
      context.shapes.gable(building.roof, {
        at: roofCentre,
        baseY: eavesY,
        width: ridgeAlongX ? roofDepth : roofWidth,
        depth: ridgeAlongX ? roofWidth : roofDepth,
        height: building.roofPitch,
        rotationY: rotationY + (ridgeAlongX ? 90 : 0),
      });
      return;
    }
    case 'hip': {
      context.shapes.pyramid(building.roof, {
        at: roofCentre,
        baseY: eavesY,
        width: roofWidth,
        depth: roofDepth,
        height: building.roofPitch,
        rotationY,
      });
      return;
    }
    case 'flat': {
      context.shapes.boxAt(
        building.roof,
        roofCentre,
        eavesY,
        [roofWidth, 0.26, roofDepth],
        rotationY,
      );
      // Parapet on all four sides.
      for (const signX of [-1, 1] as const) {
        context.shapes.boxAt(
          building.trim,
          offsetLocal(roofCentre, rotationY, (signX * roofWidth) / 2, 0),
          eavesY + 0.26,
          [0.24, 0.6, roofDepth],
          rotationY,
        );
      }
      for (const signZ of [-1, 1] as const) {
        context.shapes.boxAt(
          building.trim,
          offsetLocal(roofCentre, rotationY, 0, (signZ * roofDepth) / 2),
          eavesY + 0.26,
          [roofWidth, 0.6, 0.24],
          rotationY,
        );
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Collision and plaques
// ---------------------------------------------------------------------------

interface VerandahPadding {
  readonly front: number;
  readonly back: number;
  readonly extraX: number;
  /** Total extra depth across both faces. */
  readonly extraZ: number;
  /** Local-Z shift of the padded footprint's centre. */
  readonly offsetZ: number;
}

function verandahPadding(style: VerandahStyle): VerandahPadding {
  switch (style) {
    case 'none':
      return { front: 0, back: 0, extraX: 0, extraZ: 0, offsetZ: 0 };
    case 'front':
      return {
        front: VERANDAH_DEPTH,
        back: 0,
        extraX: 0,
        extraZ: VERANDAH_DEPTH,
        offsetZ: VERANDAH_DEPTH / 2,
      };
    case 'front-and-back':
      return {
        front: VERANDAH_DEPTH,
        back: VERANDAH_DEPTH,
        extraX: 0,
        extraZ: VERANDAH_DEPTH * 2,
        offsetZ: 0,
      };
    case 'wrap':
      return {
        front: VERANDAH_DEPTH,
        back: VERANDAH_DEPTH,
        extraX: VERANDAH_DEPTH,
        extraZ: VERANDAH_DEPTH * 2,
        offsetZ: 0,
      };
  }
}

/**
 * Registers the solid footprint.
 *
 * Phase 1 has no vertical movement, so the verandah — which sits 0.45 m up on
 * the plinth — is deliberately included in the blocked area rather than left
 * walkable. Walking it would put the camera visually through the slab. Step
 * height and a walkable verandah are Phase 2 work.
 */
function registerFootprint(context: WorldBuildContext, building: BuildingDef): void {
  const [width, , depth] = building.size;
  const padding = verandahPadding(building.verandah);
  const margin = 0.2;

  context.sink.addBoxCollider(
    building.id,
    offsetLocal(building.position, building.rotationY, 0, padding.offsetZ),
    width / 2 + padding.extraX + margin,
    depth / 2 + padding.extraZ / 2 + margin,
    building.rotationY,
  );
}

/** A readable plaque beside the main entrance, if the data file supplies one. */
function registerPlaque(context: WorldBuildContext, building: BuildingDef): void {
  if (!building.plaque) {
    return;
  }

  const [width, , depth] = building.size;
  const padding = verandahPadding(building.verandah);
  const localX = Math.min(width / 2 - 1, 2.8);
  const localZ = depth / 2 + padding.front + 0.5;
  const [x, z] = offsetLocal(building.position, building.rotationY, localX, localZ);

  // Brass plate on a post.
  context.shapes.boxAt('signPost', [x, z], 0, [0.12, 1.4, 0.12], building.rotationY);
  context.shapes.boxAt(
    'kenteGold',
    [x, z],
    1.25,
    [0.9, 0.56, 0.08],
    building.rotationY,
  );

  context.sink.addInteractable({
    id: `plaque:${building.id}`,
    position: new Vector3(x, 1.5, z),
    radius: 3.2,
    promptLabel: `Read the ${building.name} plaque`,
    eyebrow: 'Building Plaque',
    title: building.plaque.title,
    body: building.plaque.body,
    ...(building.plaque.bullets ? { bullets: building.plaque.bullets } : {}),
  });
}
