/**
 * Campus layout — THE MAIN EDITABLE DATA FILE.
 *
 * Everything here is traced from the artist's master plan,
 * `GAME_ART/campus-map/campus_masterplan.jpeg`, and is written in that image's
 * own PIXEL coordinates (measured with the image scaled to 2000 px wide). To
 * move a building, open the plan, read the new corner pixels, and type them in.
 * `src/world/*` turns these into metres; it invents nothing of its own.
 *
 * PLAN -> WORLD
 * -------------
 *   world x = (px - 1000) * 0.15      +X = east
 *   world z = (py -  558) * 0.15      +Z = south (down the image)
 *   +Y = up, 1 unit = 1 metre. North is the top of the plan.
 *
 * At 0.15 m per pixel the fenced campus is about 272 m x 142 m: big enough to
 * feel like a university, small enough to cross on a phone in about a minute.
 *
 * Because the world IS the plan, the in-game campus map (built from the same
 * image) lines up with the 3D world exactly.
 */

import type { ModelKey } from './assets';
import type { MaterialKey } from './palette';
import type { CampusBounds, SpawnDef, Vec2Tuple, ZoneDef } from '../types';

// ===========================================================================
// 0. Plan coordinate system
// ===========================================================================

export const PLAN = {
  /** Reference width the pixel coordinates below were measured at. */
  widthPx: 2000,
  heightPx: 1116,
  originPx: [1000, 558] as const,
  metresPerPx: 0.15,
} as const;

/** `[x0, y0, x1, y1]` in plan pixels, top-left to bottom-right. */
export type PlanRect = readonly [x0: number, y0: number, x1: number, y1: number];
/** `[x, y]` in plan pixels. */
export type PlanPoint = readonly [x: number, y: number];

export function planPoint(point: PlanPoint): Vec2Tuple {
  return [
    (point[0] - PLAN.originPx[0]) * PLAN.metresPerPx,
    (point[1] - PLAN.originPx[1]) * PLAN.metresPerPx,
  ];
}

export function planLength(px: number): number {
  return px * PLAN.metresPerPx;
}

/** Converts a plan rectangle to a world centre + `[width, depth]` in metres. */
export function planRect(rect: PlanRect): {
  centre: Vec2Tuple;
  size: readonly [width: number, depth: number];
} {
  const [x0, y0, x1, y1] = rect;
  return {
    centre: planPoint([(x0 + x1) / 2, (y0 + y1) / 2]),
    size: [planLength(Math.abs(x1 - x0)), planLength(Math.abs(y1 - y0))],
  };
}

// ===========================================================================
// 1. Extent and spawn
// ===========================================================================

/** The player can never leave this rectangle (just inside the fence line). */
export const CAMPUS_BOUNDS: CampusBounds = (() => {
  const [minX, minZ] = planPoint([98, 68]);
  // The south edge reaches past the fence so the player starts outside the
  // gate, as in storyboard frame 1.
  const [maxX, maxZ] = planPoint([1907, 1045]);
  return { minX, maxX, minZ, maxZ };
})();

/**
 * Outside the main gate in the inbound lane, looking up the entrance road and
 * angled slightly right so the welcome board is in view from the first frame.
 */
export const SPAWN: SpawnDef = {
  position: planPoint([990, 1036]),
  yawDegrees: -18,
};

// ===========================================================================
// 2. Ground surfaces
// ===========================================================================

export interface SurfaceRectDef {
  readonly id: string;
  readonly rect: PlanRect;
  readonly material: MaterialKey;
  /**
   * Draw order. Higher layers sit a few centimetres above lower ones:
   * 1 roads, 2 car-park and path paving, 3 plazas and patios, 4 markings.
   */
  readonly layer: 1 | 2 | 3 | 4;
  /** Dashed white centre line along the long axis (roads only). */
  readonly centreLine?: boolean;
}

export interface SurfaceDiscDef {
  readonly id: string;
  readonly centre: PlanPoint;
  readonly radiusPx: number;
  readonly material: MaterialKey;
  readonly layer: 1 | 2 | 3 | 4;
}

export const ROADS: readonly SurfaceRectDef[] = [
  // Public road outside the fence (beyond the playable area, for context).
  { id: 'public-road', rect: [0, 1050, 2000, 1098], material: 'asphalt', layer: 1, centreLine: true },
  { id: 'entrance-road', rect: [975, 856, 1050, 1050], material: 'asphalt', layer: 1, centreLine: true },
  { id: 'south-road', rect: [180, 820, 1215, 856], material: 'asphalt', layer: 1, centreLine: true },
  { id: 'west-road', rect: [180, 372, 215, 856], material: 'asphalt', layer: 1 },
  { id: 'north-road', rect: [180, 356, 1865, 390], material: 'asphalt', layer: 1, centreLine: true },
  { id: 'inner-road', rect: [545, 390, 580, 820], material: 'asphalt', layer: 1 },
  { id: 'courtyard-north-spoke', rect: [995, 390, 1030, 440], material: 'asphalt', layer: 1 },
  { id: 'courtyard-south-spoke', rect: [995, 720, 1030, 820], material: 'asphalt', layer: 1 },
  { id: 'hostel-road-west', rect: [1005, 75, 1035, 356], material: 'asphalt', layer: 1 },
  { id: 'hostel-road-north', rect: [1005, 75, 1865, 100], material: 'asphalt', layer: 1 },
  { id: 'hostel-road-east', rect: [1840, 75, 1865, 356], material: 'asphalt', layer: 1 },
  { id: 'hostel-road-middle', rect: [1475, 100, 1505, 356], material: 'asphalt', layer: 1 },
  { id: 'east-road', rect: [1745, 390, 1775, 455], material: 'asphalt', layer: 1 },
];

export const ROAD_DISCS: readonly SurfaceDiscDef[] = [
  // Ring road around the central courtyard, then the stone plaza on top of it.
  { id: 'courtyard-ring-road', centre: [1012, 580], radiusPx: 145, material: 'asphalt', layer: 1 },
  { id: 'courtyard-plaza', centre: [1012, 580], radiusPx: 112, material: 'pavingStone', layer: 3 },
  // Small roundabout where the entrance road meets the south road.
  { id: 'gate-roundabout', centre: [1012, 838], radiusPx: 66, material: 'asphalt', layer: 1 },
  { id: 'gate-roundabout-island', centre: [1012, 838], radiusPx: 34, material: 'lawn', layer: 3 },
];

export const PATHS: readonly SurfaceRectDef[] = [
  // Footpaths either side of the north road.
  { id: 'north-road-path-n', rect: [215, 345, 1840, 356], material: 'pavingTan', layer: 2 },
  { id: 'north-road-path-s', rect: [215, 390, 1840, 401], material: 'pavingTan', layer: 2 },
  // Paved precincts around the library and the lecture halls.
  { id: 'library-precinct', rect: [262, 425, 515, 740], material: 'pavingTan', layer: 2 },
  { id: 'lecture-precinct', rect: [580, 398, 832, 810], material: 'pavingTan', layer: 2 },
  // Paths into the courtyard.
  { id: 'courtyard-path-west', rect: [832, 560, 875, 600], material: 'pavingTan', layer: 2 },
  { id: 'courtyard-path-east', rect: [1150, 548, 1250, 612], material: 'pavingTan', layer: 2 },
  // Pavements beside the entrance road.
  { id: 'entrance-path-west', rect: [958, 860, 975, 1048], material: 'pavingTan', layer: 2 },
  { id: 'entrance-path-east', rect: [1050, 860, 1067, 1048], material: 'pavingTan', layer: 2 },
  // Student centre approaches.
  { id: 'student-centre-path-n', rect: [1355, 401, 1385, 440], material: 'pavingTan', layer: 2 },
  { id: 'student-centre-path-s', rect: [1355, 718, 1385, 790], material: 'pavingTan', layer: 2 },
  // Hostel gateways to the road.
  { id: 'hostel-a-path', rect: [1290, 322, 1335, 345], material: 'pavingTan', layer: 2 },
  { id: 'hostel-b-path', rect: [1650, 322, 1695, 345], material: 'pavingTan', layer: 2 },
  // Administration and engineering approaches.
  { id: 'admin-path', rect: [866, 245, 894, 345], material: 'pavingTan', layer: 2 },
  { id: 'east-cross-path', rect: [1545, 732, 1900, 745], material: 'pavingTan', layer: 2 },
  { id: 'engineering-path', rect: [1716, 745, 1744, 790], material: 'pavingTan', layer: 2 },
  // Cafeteria outdoor dining terrace.
  { id: 'cafeteria-patio', rect: [1598, 420, 1705, 705], material: 'pavingStone', layer: 3 },
];

export interface CarParkDef {
  readonly id: string;
  readonly rect: PlanRect;
  /** Bay lines run across this axis: 'x' = lines parallel to X. */
  readonly bayLines: 'x' | 'z';
  /** Bay pitch in plan pixels. */
  readonly bayPx: number;
  /** Two rows of bays, nose to nose, split down the middle. */
  readonly doubleRow: boolean;
  /** How many bays have a parked car. Placement is seeded. */
  readonly cars: number;
  readonly seed: number;
}

export const CAR_PARKS: readonly CarParkDef[] = [
  { id: 'car-park-west', rect: [150, 450, 250, 705], bayLines: 'x', bayPx: 25, doubleRow: true, cars: 7, seed: 11 },
  { id: 'car-park-library', rect: [255, 760, 505, 800], bayLines: 'z', bayPx: 25, doubleRow: false, cars: 4, seed: 23 },
  { id: 'car-park-north', rect: [1035, 120, 1115, 300], bayLines: 'x', bayPx: 22, doubleRow: true, cars: 6, seed: 37 },
  { id: 'car-park-east', rect: [1710, 455, 1810, 700], bayLines: 'x', bayPx: 25, doubleRow: true, cars: 8, seed: 41 },
  { id: 'car-park-south', rect: [1215, 790, 1530, 900], bayLines: 'z', bayPx: 25, doubleRow: true, cars: 8, seed: 53 },
];

// ===========================================================================
// 3. Sports
// ===========================================================================

export const FOOTBALL_FIELD = {
  id: 'football-field',
  /** Tan running surround. */
  surround: [205, 92, 615, 350] as PlanRect,
  /** Playing surface, inside the touchlines. */
  pitch: [245, 115, 578, 322] as PlanRect,
} as const;

export const BASKETBALL_COURT = {
  id: 'basketball-court',
  court: [625, 117, 752, 315] as PlanRect,
} as const;

// ===========================================================================
// 4. Buildings
// ===========================================================================

export type Facing = 'north' | 'south' | 'east' | 'west';

/**
 * One rectangular block of a building. Every building is a list of wings, which
 * is how H-plans, courtyard rings and C-shapes are all described with the same
 * generator — and why each wing gets its own collider, so you can walk into the
 * open courts of an H.
 */
export interface WingDef {
  readonly rect: PlanRect;
  /** Faces that get a balconied corridor (verandah) on every storey. */
  readonly verandah: readonly Facing[];
  /** External stair towers at both short ends, as in the elevation sheets. */
  readonly stairs?: boolean;
}

export interface BuildingPlaque {
  readonly title: string;
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
}

export interface BuildingDef {
  readonly id: string;
  readonly name: string;
  readonly kind: 'lecture' | 'library' | 'service' | 'hostel' | 'admin' | 'gate';
  readonly wings: readonly WingDef[];
  readonly storeys: number;
  /** Wall height in metres, plinth to eaves. */
  readonly height: number;
  readonly walls: MaterialKey;
  /** Stair-tower render. Hostel A in the art has red stair cores. */
  readonly stairAccent: MaterialKey;
  readonly roof: 'hip' | 'flat';
  /** Ridge height above the eaves, in metres. */
  readonly roofPitch: number;
  /** Main entrance: door, steps and canopy on this face, at this point. */
  readonly entrance: { readonly at: PlanPoint; readonly facing: Facing } | null;
  /** Lettering on the canopy fascia, e.g. "LIBRARY". `null` = none. */
  readonly nameBoard: string | null;
  readonly plaque: BuildingPlaque | null;
  /** Set to an asset key once a real glTF exists; placeholders are skipped. */
  readonly model: ModelKey | null;
}

/**
 * An upright H: two wings running north-south joined by a crossbar.
 *
 * The H-plan is the signature form on this campus — the library, the student
 * centre, the administration block and the faculty of engineering all use it.
 * Pass the H's bounding box, how wide each upright is, and where the crossbar
 * sits; everything else is derived.
 */
export function hPlan(
  bounds: PlanRect,
  uprightPx: number,
  crossbar: readonly [y0: number, y1: number],
  options: { readonly crossbarVerandah?: readonly Facing[]; readonly stairs?: boolean } = {},
): WingDef[] {
  const [x0, y0, x1, y1] = bounds;
  return [
    { rect: [x0, y0, x0 + uprightPx, y1], verandah: ['west'], stairs: options.stairs ?? true },
    { rect: [x1 - uprightPx, y0, x1, y1], verandah: ['east'], stairs: options.stairs ?? true },
    {
      rect: [x0 + uprightPx, crossbar[0], x1 - uprightPx, crossbar[1]],
      verandah: options.crossbarVerandah ?? ['north', 'south'],
    },
  ];
}

/**
 * A courtyard block open to the south through a gateway, as in the hostel
 * elevations. `gate` is the x-range of the opening in the south range.
 */
function courtyardPlan(outer: PlanRect, hole: PlanRect, gate: readonly [number, number]): WingDef[] {
  const [ox0, oy0, ox1, oy1] = outer;
  const [hx0, hy0, hx1, hy1] = hole;
  return [
    { rect: [ox0, oy0, ox1, hy0], verandah: ['south'], stairs: true },
    { rect: [ox0, hy0, hx0, oy1], verandah: ['east'] },
    { rect: [hx1, hy0, ox1, oy1], verandah: ['west'] },
    { rect: [hx0, hy1, gate[0], oy1], verandah: ['north'] },
    { rect: [gate[1], hy1, hx1, oy1], verandah: ['north'] },
  ];
}

/** A closed rectangular ring, corridors on the two long outside faces. */
function ringPlan(outer: PlanRect, hole: PlanRect, verandah: { north: boolean; south: boolean }): WingDef[] {
  const [ox0, oy0, ox1, oy1] = outer;
  const [hx0, hy0, hx1, hy1] = hole;
  return [
    { rect: [ox0, oy0, ox1, hy0], verandah: verandah.north ? ['north'] : [], stairs: true },
    { rect: [ox0, hy1, ox1, oy1], verandah: verandah.south ? ['south'] : [], stairs: true },
    { rect: [ox0, hy0, hx0, hy1], verandah: [] },
    { rect: [hx1, hy0, ox1, hy1], verandah: [] },
  ];
}

const LECTURE_STYLE = {
  storeys: 3,
  height: 11,
  walls: 'wallCream',
  stairAccent: 'wallCream',
  roof: 'hip',
  roofPitch: 3.4,
  model: null,
} as const;

export const BUILDINGS: readonly BuildingDef[] = [
  // ------------------------------------------------------------ (4) Library
  {
    id: 'library',
    name: 'Library',
    kind: 'library',
    wings: hPlan([275, 435, 497, 725], 70, [548, 617]),
    ...LECTURE_STYLE,
    entrance: { at: [497, 582], facing: 'east' },
    nameBoard: 'LIBRARY',
    plaque: {
      title: 'Library',
      body: [
        'Three floors of reading rooms in two wings, joined across the middle. Open 07:00 to 22:00 in term time.',
        'The H-plan gives every reading room windows on two sides, so the cross-breeze keeps the stacks cool without air conditioning.',
      ],
      bullets: ['Seats: 600', 'Wi-Fi: yes, when it feels like it'],
    },
  },

  // ------------------------------------------------------ (3) Lecture halls
  {
    id: 'lecture-hall-1',
    name: 'Lecture Hall 1',
    kind: 'lecture',
    wings: ringPlan([610, 408, 808, 535], [655, 452, 765, 492], { north: true, south: false }),
    ...LECTURE_STYLE,
    entrance: { at: [808, 472], facing: 'east' },
    nameBoard: 'LECTURE HALL 1',
    plaque: {
      title: 'Lecture Hall 1',
      body: ['Tiered lecture theatres around a small light court. LH1 101 to LH1 312.'],
      bullets: ['Theatres: 9'],
    },
  },
  {
    id: 'lecture-hall-2',
    name: 'Lecture Hall 2',
    kind: 'lecture',
    wings: [{ rect: [610, 562, 778, 625], verandah: ['north'], stairs: true }],
    ...LECTURE_STYLE,
    entrance: { at: [778, 594], facing: 'east' },
    nameBoard: 'LECTURE HALL 2',
    plaque: {
      title: 'Lecture Hall 2',
      body: ['Seminar rooms and tutorial spaces, linked to the halls either side by first-floor bridges.'],
    },
  },
  {
    id: 'lecture-hall-3',
    name: 'Lecture Hall 3',
    kind: 'lecture',
    wings: ringPlan([610, 650, 808, 782], [655, 695, 765, 740], { north: false, south: true }),
    ...LECTURE_STYLE,
    entrance: { at: [808, 717], facing: 'east' },
    nameBoard: 'LECTURE HALL 3',
    plaque: {
      title: 'Lecture Hall 3',
      body: ['The largest theatres on campus. Exams are held here, and so are the queues outside them.'],
      bullets: ['Largest room: 450 seats'],
    },
  },

  // ---------------------------------------------- (5) Student centre — an H
  {
    id: 'student-centre',
    name: 'Student Centre',
    kind: 'service',
    wings: hPlan([1250, 440, 1490, 718], 60, [548, 608]),
    storeys: 2,
    height: 8,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 3,
    entrance: { at: [1250, 578], facing: 'west' },
    nameBoard: 'STUDENT CENTRE',
    plaque: {
      title: 'Student Centre',
      body: [
        'SRC offices, the bookshop, the bank and the clinic, all under one H-shaped roof facing the courtyard.',
        'The cafeteria is across the bridge to the east.',
      ],
    },
    model: null,
  },

  // --------------------------------------------------------- (6) Cafeteria
  {
    id: 'cafeteria',
    name: 'Cafeteria',
    kind: 'service',
    wings: [
      { rect: [1545, 497, 1580, 645], verandah: ['east'] },
      { rect: [1580, 497, 1635, 530], verandah: [], stairs: true },
      { rect: [1580, 612, 1635, 645], verandah: [], stairs: true },
    ],
    storeys: 2,
    height: 8,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 2.8,
    entrance: { at: [1608, 645], facing: 'south' },
    nameBoard: 'CAFETERIA',
    plaque: {
      title: 'Cafeteria',
      body: [
        'Waakye in the morning, red-red at lunch, jollof whenever the kitchen feels generous.',
        'The upper terrace looks out over the umbrellas on the patio.',
      ],
    },
    model: null,
  },
  {
    id: 'cafeteria-kiosk-north',
    name: 'Cafeteria Kiosk',
    kind: 'service',
    wings: [{ rect: [1545, 425, 1595, 485], verandah: [] }],
    storeys: 1,
    height: 3.6,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 2,
    entrance: null,
    nameBoard: null,
    plaque: null,
    model: null,
  },
  {
    id: 'cafeteria-kiosk-south',
    name: 'Cafeteria Kiosk',
    kind: 'service',
    wings: [{ rect: [1545, 655, 1595, 697], verandah: [] }],
    storeys: 1,
    height: 3.6,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 2,
    entrance: null,
    nameBoard: null,
    plaque: null,
    model: null,
  },

  // ----------------------------------------------------------- (7) Hostels
  {
    id: 'hostel-a',
    name: 'Hastech Hostels — Block A',
    kind: 'hostel',
    wings: courtyardPlan([1165, 122, 1460, 322], [1225, 175, 1400, 270], [1280, 1345]),
    storeys: 4,
    height: 14,
    walls: 'wallCream',
    stairAccent: 'wallRed',
    roof: 'hip',
    roofPitch: 3.6,
    entrance: null,
    nameBoard: null,
    plaque: {
      title: 'Hastech Hostels — Block A',
      body: [
        'Four storeys of rooms around a planted court, entered through the gateway under the sign.',
        'In a later phase this is where your room, your roommate and the water timetable live.',
      ],
    },
    model: null,
  },
  {
    id: 'hostel-b',
    name: 'Hastech Hostels — Block B',
    kind: 'hostel',
    wings: courtyardPlan([1525, 122, 1820, 322], [1585, 175, 1760, 270], [1640, 1705]),
    storeys: 4,
    height: 14,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 3.6,
    entrance: null,
    nameBoard: null,
    plaque: {
      title: 'Hastech Hostels — Block B',
      body: ['The twin of Block A. Rivalry between the two blocks peaks during hall week.'],
    },
    model: null,
  },

  // ------------------------------------- Administration block — another H
  {
    id: 'administration',
    name: 'Administration Block',
    kind: 'admin',
    wings: hPlan([805, 120, 955, 320], 48, [195, 245], { crossbarVerandah: ['south'] }),
    storeys: 2,
    height: 8,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 3,
    entrance: { at: [880, 245], facing: 'south' },
    nameBoard: 'ADMINISTRATION',
    plaque: {
      title: 'Administration Block',
      body: [
        "The registry, the bursar and the Vice-Chancellor's office. Bring three photocopies of everything.",
      ],
    },
    model: null,
  },

  // --------------------------------- Faculty of Engineering — a fourth H
  {
    id: 'engineering',
    name: 'Faculty of Engineering',
    kind: 'lecture',
    wings: hPlan([1610, 790, 1850, 975], 62, [852, 912]),
    ...LECTURE_STYLE,
    entrance: { at: [1730, 852], facing: 'north' },
    nameBoard: 'FACULTY OF ENGINEERING',
    plaque: {
      title: 'Faculty of Engineering',
      body: [
        'Workshops on the ground floor, drawing studios above, in an H-plan block on the east lawn.',
      ],
      bullets: ['Departments: Civil, Mechanical, Electrical, Computer'],
    },
  },

  // ---------------------------------------------------------- (1) The gate
  {
    id: 'guard-hut',
    name: "Porter's Lodge",
    kind: 'gate',
    wings: [{ rect: [905, 940, 945, 975], verandah: [] }],
    storeys: 1,
    height: 3.2,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 1.6,
    entrance: { at: [945, 958], facing: 'east' },
    nameBoard: null,
    plaque: {
      title: "Porter's Lodge",
      body: ['Visitors sign in here. No ID card, no entry — and the porter has heard every excuse already.'],
      bullets: ['Gate closes: 22:00'],
    },
    model: null,
  },
  {
    id: 'gate-booth',
    name: 'Security Booth',
    kind: 'gate',
    wings: [{ rect: [1003, 950, 1022, 988], verandah: [] }],
    storeys: 1,
    height: 2.8,
    walls: 'wallCream',
    stairAccent: 'wallCream',
    roof: 'hip',
    roofPitch: 1.3,
    entrance: null,
    nameBoard: null,
    plaque: null,
    model: null,
  },
];

/**
 * Buildings that are in the game but NOT on the artist's master plan image.
 * The campus map overlays these on the plan so it never shows empty lawn
 * where a building actually stands.
 */
export const ADDED_SINCE_MASTER_PLAN: readonly string[] = ['administration', 'engineering'];

/** First-floor footbridges and gateway canopies. Walk underneath them. */
export interface BridgeDef {
  readonly id: string;
  readonly rect: PlanRect;
  /** Underside height in metres. */
  readonly clearance: number;
  readonly depth: number;
  /** Lettering on the bridge fascia, facing this way. */
  readonly sign: { readonly text: string; readonly facing: Facing } | null;
}

export const BRIDGES: readonly BridgeDef[] = [
  { id: 'lh1-lh2-bridge', rect: [695, 535, 725, 562], clearance: 3.6, depth: 0.5, sign: null },
  { id: 'lh2-lh3-bridge', rect: [695, 625, 725, 650], clearance: 3.6, depth: 0.5, sign: null },
  { id: 'student-centre-cafeteria-bridge', rect: [1490, 567, 1545, 592], clearance: 3.6, depth: 0.5, sign: null },
  {
    id: 'hostel-a-gateway',
    rect: [1280, 285, 1345, 312],
    clearance: 4.2,
    depth: 1.6,
    sign: { text: 'HASTECH HOSTELS', facing: 'south' },
  },
  {
    id: 'hostel-b-gateway',
    rect: [1640, 285, 1705, 312],
    clearance: 4.2,
    depth: 1.6,
    sign: { text: 'HASTECH HOSTELS', facing: 'south' },
  },
];

// ===========================================================================
// 5. Courtyard monument, fence and gate
// ===========================================================================

export const MONUMENT = {
  id: 'courtyard-monument',
  centre: [1012, 580] as PlanPoint,
  /** Width of the bottom step, in metres. */
  baseWidth: 7,
  height: 7.5,
} as const;

export interface FenceDef {
  readonly id: string;
  readonly from: PlanPoint;
  readonly to: PlanPoint;
}

/** Perimeter fence: a low rendered wall with railings, as on the plan. */
export const FENCE: readonly FenceDef[] = [
  { id: 'fence-north', from: [95, 65], to: [1910, 65] },
  { id: 'fence-west', from: [95, 65], to: [95, 1012] },
  { id: 'fence-east', from: [1910, 65], to: [1910, 1012] },
  { id: 'fence-south-west', from: [95, 1012], to: [955, 1012] },
  { id: 'fence-south-east', from: [1068, 1012], to: [1910, 1012] },
];

/** Raised barrier arms at the security booth. Raised = no collider. */
export const GATE_BARRIERS = {
  booth: [1012, 969] as PlanPoint,
  armLength: 5.4,
  /** Angle above horizontal: the gate is open during the day. */
  raisedDegrees: 72,
} as const;

export interface HedgeDef {
  readonly id: string;
  readonly from: PlanPoint;
  readonly to: PlanPoint;
  readonly height: number;
}

export const HEDGES: readonly HedgeDef[] = [
  // Around the administration lawn, open on the south for the path.
  { id: 'admin-hedge-north', from: [765, 82], to: [995, 82], height: 1.2 },
  { id: 'admin-hedge-west', from: [765, 82], to: [765, 345], height: 1.2 },
  { id: 'admin-hedge-east', from: [995, 82], to: [995, 345], height: 1.2 },
  { id: 'admin-hedge-south-w', from: [765, 345], to: [862, 345], height: 1.2 },
  { id: 'admin-hedge-south-e', from: [898, 345], to: [995, 345], height: 1.2 },
  // Around the engineering lawn, open on the north for the path.
  { id: 'eng-hedge-north-w', from: [1548, 750], to: [1712, 750], height: 1.2 },
  { id: 'eng-hedge-north-e', from: [1748, 750], to: [1895, 750], height: 1.2 },
  { id: 'eng-hedge-west', from: [1548, 750], to: [1548, 1005], height: 1.2 },
  // Low planting along the south road and the library car park.
  { id: 'south-road-hedge', from: [230, 870], to: [930, 870], height: 0.8 },
  { id: 'library-carpark-hedge', from: [258, 752], to: [505, 752], height: 0.8 },
];

// ===========================================================================
// 6. Planting
// ===========================================================================

export type TreeSpecies = 'palm' | 'fanPalm' | 'mango' | 'neem' | 'flamboyant';

export interface TreeDef {
  readonly id: string;
  readonly species: TreeSpecies;
  readonly at: PlanPoint;
  readonly scale: number;
}

const tree = (id: string, species: TreeSpecies, x: number, y: number, scale = 1): TreeDef => ({
  id,
  species,
  at: [x, y],
  scale,
});

export const TREES: readonly TreeDef[] = [
  // Palms lining the entrance road, as in storyboard frame 2.
  tree('entry-palm-w1', 'palm', 948, 882, 1.05),
  tree('entry-palm-w2', 'palm', 948, 918, 0.95),
  tree('entry-palm-e1', 'palm', 1077, 882, 1),
  tree('entry-palm-e2', 'palm', 1077, 918, 1.08),
  // The four shade trees around the courtyard monument.
  tree('plaza-mango-nw', 'mango', 952, 520, 1.1),
  tree('plaza-mango-ne', 'mango', 1072, 520, 1.05),
  tree('plaza-neem-sw', 'neem', 952, 640, 1),
  tree('plaza-neem-se', 'neem', 1072, 640, 1.08),
  // Flame trees and palms on the courtyard lawns.
  tree('court-flam-nw', 'flamboyant', 880, 425, 1),
  tree('court-flam-ne', 'flamboyant', 1150, 430, 1.05),
  tree('court-palm-sw', 'fanPalm', 880, 760, 1),
  tree('court-palm-se', 'fanPalm', 1140, 770, 1),
  // Two rows of shade trees along the south lawn.
  ...[280, 370, 460, 550, 640, 730, 820, 905].map((x, i) =>
    tree(`south-row-a-${i}`, i % 2 === 0 ? 'mango' : 'neem', x, 892, 0.95 + (i % 3) * 0.06),
  ),
  ...[300, 420, 540, 660, 780, 900].map((x, i) =>
    tree(`south-row-b-${i}`, 'neem', x, 985, 1 + (i % 2) * 0.08),
  ),
  // Trees in the hostel courts.
  tree('hostel-a-court-1', 'mango', 1258, 205, 0.85),
  tree('hostel-a-court-2', 'fanPalm', 1368, 205, 0.85),
  tree('hostel-b-court-1', 'fanPalm', 1618, 205, 0.85),
  tree('hostel-b-court-2', 'mango', 1728, 205, 0.85),
];

export interface TreeScatterZoneDef {
  readonly id: string;
  readonly rect: PlanRect;
  readonly species: readonly TreeSpecies[];
  /** Target count at `scatterDensity: 1`. Low quality plants fewer. */
  readonly count: number;
  /** Any integer. Same seed = same campus on every device and every load. */
  readonly seed: number;
  readonly minScale: number;
  readonly maxScale: number;
  /** Metres to keep clear of buildings, roads, paths and other trees. */
  readonly clearance: number;
}

export const TREE_SCATTER_ZONES: readonly TreeScatterZoneDef[] = [
  { id: 'west-belt', rect: [100, 75, 172, 1005], species: ['neem', 'mango'], count: 18, seed: 1957, minScale: 0.9, maxScale: 1.3, clearance: 1.8 },
  { id: 'east-belt', rect: [1868, 380, 1905, 1005], species: ['neem', 'mango', 'palm'], count: 12, seed: 6957, minScale: 0.85, maxScale: 1.2, clearance: 1.8 },
  { id: 'courtyard-lawns', rect: [832, 400, 1195, 815], species: ['mango', 'neem', 'fanPalm'], count: 10, seed: 2024, minScale: 0.85, maxScale: 1.1, clearance: 2.2 },
  { id: 'lecture-library-verge', rect: [515, 400, 545, 815], species: ['palm', 'fanPalm'], count: 5, seed: 404, minScale: 0.85, maxScale: 1.05, clearance: 1.5 },
  { id: 'student-centre-lawns', rect: [1215, 405, 1540, 790], species: ['mango', 'fanPalm'], count: 8, seed: 515, minScale: 0.8, maxScale: 1.05, clearance: 2 },
  { id: 'admin-lawn', rect: [772, 90, 988, 338], species: ['fanPalm', 'mango'], count: 5, seed: 707, minScale: 0.8, maxScale: 1, clearance: 2 },
  { id: 'engineering-lawn', rect: [1556, 758, 1898, 1005], species: ['neem', 'mango', 'flamboyant'], count: 10, seed: 909, minScale: 0.85, maxScale: 1.15, clearance: 2 },
  { id: 'gate-lawns', rect: [1070, 870, 1540, 1005], species: ['neem', 'palm', 'mango'], count: 9, seed: 1111, minScale: 0.85, maxScale: 1.1, clearance: 2 },
];

// ===========================================================================
// 7. Street furniture
// ===========================================================================

export interface BenchDef {
  readonly id: string;
  readonly at: PlanPoint;
  /** Degrees. 0 = the seated person faces south (+Z). */
  readonly rotationY: number;
}

const PLAZA_CENTRE: PlanPoint = [1012, 580];

/** Benches spaced around a circle, all facing its centre. */
function benchRing(prefix: string, centre: PlanPoint, radiusPx: number, count: number, offsetDeg: number): BenchDef[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = ((offsetDeg + (index * 360) / count) * Math.PI) / 180;
    const dx = Math.cos(angle) * radiusPx;
    const dy = Math.sin(angle) * radiusPx;
    return {
      id: `${prefix}-${index}`,
      at: [centre[0] + dx, centre[1] + dy] as PlanPoint,
      // Face the centre: rotate local +Z onto (-dx, -dy).
      rotationY: (Math.atan2(-dx, -dy) * 180) / Math.PI,
    };
  });
}

export const BENCHES: readonly BenchDef[] = [
  ...benchRing('plaza-bench', PLAZA_CENTRE, 92, 8, 22.5),
  { id: 'lecture-bench-1', at: [840, 520], rotationY: 90 },
  { id: 'lecture-bench-2', at: [840, 650], rotationY: 90 },
  { id: 'library-bench-1', at: [525, 520], rotationY: -90 },
  { id: 'library-bench-2', at: [525, 650], rotationY: -90 },
  { id: 'sc-bench-1', at: [1205, 530], rotationY: 0 },
  { id: 'sc-bench-2', at: [1205, 632], rotationY: 180 },
  { id: 'entry-bench-1', at: [948, 950], rotationY: 90 },
  { id: 'hostel-a-bench', at: [1312, 238], rotationY: 0 },
  { id: 'hostel-b-bench', at: [1672, 238], rotationY: 0 },
];

export interface LampDef {
  readonly id: string;
  readonly at: PlanPoint;
  readonly height: number;
  /** Direction the arm reaches, in degrees (0 = south). Usually over the road. */
  readonly armDegrees: number;
}

function lampRow(prefix: string, from: PlanPoint, to: PlanPoint, count: number, armDegrees: number): LampDef[] {
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    return {
      id: `${prefix}-${index}`,
      at: [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as PlanPoint,
      height: 6,
      armDegrees,
    };
  });
}

export const LAMPS: readonly LampDef[] = [
  ...lampRow('entry-lamp-w', [962, 870], [962, 1000], 3, 90),
  ...lampRow('entry-lamp-e', [1063, 870], [1063, 1000], 3, -90),
  ...lampRow('north-road-lamp', [260, 398], [1800, 398], 9, 180),
  ...lampRow('south-road-lamp', [260, 864], [920, 864], 4, 180),
  // Around the plaza edge, between the bench pairs.
  ...benchRing('plaza-lamp', PLAZA_CENTRE, 116, 4, 45).map((spot) => ({
    id: spot.id,
    at: spot.at,
    height: 5.5,
    armDegrees: spot.rotationY,
  })),
];

/** Litter bins and bollards, the small concrete props from the props sheet. */
export const BINS: readonly PlanPoint[] = [
  [1032, 470], [992, 690], [895, 590], [1135, 575], [858, 600], [1172, 612], [972, 1000], [1052, 1000],
];

export const BOLLARDS: readonly PlanPoint[] = [
  [868, 558], [868, 602], [1156, 546], [1156, 614], [1250, 548], [1250, 612],
];

/** Umbrellas and tables on the cafeteria patio. */
export const PATIO_UMBRELLAS: readonly PlanPoint[] = [
  [1628, 445], [1675, 445], [1628, 492], [1675, 492], [1628, 538], [1675, 538],
  [1628, 585], [1675, 585], [1628, 632], [1675, 632], [1628, 678], [1675, 678],
];

// ===========================================================================
// 8. Signage — the interactive objects
// ===========================================================================

export interface SignInteractionDef {
  readonly promptLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
}

export interface SignDef {
  readonly id: string;
  /** campus-board = big welcome board; finger-post = timber direction sign. */
  readonly kind: 'campus-board' | 'finger-post' | 'notice';
  readonly at: PlanPoint;
  /** Degrees. The sign face looks along local +Z (0 = faces south). */
  readonly rotationY: number;
  readonly interactionRadius: number;
  /** Words painted on the sign itself (finger-post arms or board header). */
  readonly labels: readonly string[];
  readonly interaction: SignInteractionDef;
}

export const SIGNS: readonly SignDef[] = [
  {
    // THE campus sign, just inside the gate, in view from the spawn point.
    id: 'campus-welcome-sign',
    kind: 'campus-board',
    at: [1092, 978],
    rotationY: -45,
    interactionRadius: 4.5,
    labels: ['AKWAABA', 'WELCOME TO UCIS UNIVERSITY'],
    interaction: {
      promptLabel: 'Read the campus sign',
      eyebrow: 'Campus Sign',
      title: 'Akwaaba — Welcome to UCIS University',
      body: [
        'Straight ahead, past the roundabout, is the central courtyard and its monument. Every part of campus is reached from the ring road around it.',
        'Open the campus map from the pause menu at any time.',
      ],
      bullets: [
        'North — Courtyard, then the Administration Block and the sports fields',
        'West — Lecture Halls 1–3 and the Library',
        'East — Student Centre, Cafeteria and the Faculty of Engineering',
        'North-east — Hastech Hostels, Blocks A and B',
      ],
    },
  },
  {
    // The timber finger-post from storyboard frame 4.
    id: 'courtyard-finger-post',
    kind: 'finger-post',
    at: [1052, 742],
    rotationY: 0,
    interactionRadius: 3.6,
    labels: ['LIBRARY', 'LECTURE HALLS', 'HOSTELS', 'CAFETERIA'],
    interaction: {
      promptLabel: 'Read the signpost',
      eyebrow: 'Signpost',
      title: 'Which way?',
      body: ['A weathered timber signpost at the south entrance to the courtyard.'],
      bullets: [
        'Library — west, past the lecture halls',
        'Lecture Halls — west across the courtyard',
        'Hostels — north, then east along the north road',
        'Cafeteria — east, through the Student Centre',
      ],
    },
  },
  {
    id: 'src-notice-board',
    kind: 'notice',
    at: [1228, 628],
    rotationY: -90,
    interactionRadius: 3,
    labels: ['SRC NOTICES'],
    interaction: {
      promptLabel: 'Read the notice board',
      eyebrow: 'SRC Notice Board',
      title: 'SRC Notice Board',
      body: ['Hand-written and stapled over each other, three deep.'],
      bullets: [
        'HALL WEEK — jollof cook-off, Saturday, 6 p.m.',
        'LOST: one ID card, name worn off. See the porter.',
        'Football: Block A vs Block B, Friday 4 p.m.',
      ],
    },
  },
];

// ===========================================================================
// 9. HUD location zones
// ===========================================================================

export interface PlanZoneDef {
  readonly id: string;
  readonly name: string;
  readonly rect: PlanRect;
  /** Higher priority wins where rectangles overlap. */
  readonly priority: number;
}

export const PLAN_ZONES: readonly PlanZoneDef[] = [
  { id: 'zone-gate', name: 'Main Gate', rect: [880, 890, 1150, 1048], priority: 3 },
  { id: 'zone-courtyard', name: 'Central Courtyard', rect: [865, 432, 1160, 728], priority: 2 },
  { id: 'zone-lecture', name: 'Lecture Halls', rect: [580, 395, 835, 812], priority: 3 },
  { id: 'zone-library', name: 'Library', rect: [255, 420, 520, 745], priority: 3 },
  { id: 'zone-student-centre', name: 'Student Centre', rect: [1240, 425, 1505, 735], priority: 3 },
  { id: 'zone-cafeteria', name: 'Cafeteria', rect: [1540, 418, 1706, 707], priority: 3 },
  { id: 'zone-hostels', name: 'Hastech Hostels', rect: [1160, 108, 1826, 340], priority: 3 },
  { id: 'zone-football', name: 'Football Field', rect: [205, 92, 615, 350], priority: 3 },
  { id: 'zone-basketball', name: 'Basketball Court', rect: [622, 112, 756, 320], priority: 3 },
  { id: 'zone-admin', name: 'Administration', rect: [765, 82, 995, 345], priority: 3 },
  { id: 'zone-engineering', name: 'Faculty of Engineering', rect: [1548, 745, 1898, 1010], priority: 3 },
  { id: 'zone-car-park-west', name: 'Car Park', rect: [148, 448, 252, 707], priority: 2 },
  { id: 'zone-car-park-south', name: 'Car Park', rect: [1213, 788, 1532, 902], priority: 2 },
  { id: 'zone-car-park-east', name: 'Car Park', rect: [1708, 453, 1812, 702], priority: 2 },
];

/** Plan zones converted to the world-space rectangles the HUD resolver reads. */
export const ZONES: readonly ZoneDef[] = PLAN_ZONES.map((zone) => {
  const { centre, size } = planRect(zone.rect);
  return { id: zone.id, name: zone.name, centre, size, priority: zone.priority };
});

/** Shown whenever the player is not inside any named zone. */
export const DEFAULT_ZONE_NAME = 'Central Campus';
