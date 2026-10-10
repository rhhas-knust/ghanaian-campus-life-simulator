/**
 * Campus layout — THE MAIN EDITABLE DATA FILE.
 *
 * Every object in the world is described here as plain data. `src/world/*`
 * reads this file and generates geometry; it invents nothing of its own. Move a
 * building by editing two numbers, and the mesh, its shadow, its collider, its
 * plaque and its HUD zone all follow.
 *
 * COORDINATE SYSTEM
 * -----------------
 *   +X = east, -X = west
 *   +Z = south, -Z = north   (so the campus runs *northwards* from the gate)
 *   +Y = up. The ground plane is y = 0 and the campus is flat in Phase 1.
 *   1 unit = 1 metre. Rotations in this file are in DEGREES (converted on load).
 *
 * The player spawns at the southern entrance looking north up the main avenue.
 *
 *            N  (-Z)
 *     Engineering   Great Hall   Library
 *            ── north cross path ──
 *     Nkrumah |   COURTYARD   | Asantewaa
 *            ── main avenue ──
 *   Students' Centre      Porter's Lodge
 *              ENTRANCE GATE
 *            S  (+Z)
 */

import type { ModelKey } from './assets';
import type { MaterialKey } from './palette';
import type { CampusBounds, SizeTuple, SpawnDef, Vec2Tuple, ZoneDef } from '../types';

// ===========================================================================
// 1. Overall extent and spawn
// ===========================================================================

/** The player can never walk outside this rectangle. */
export const CAMPUS_BOUNDS: CampusBounds = {
  minX: -56,
  maxX: 56,
  minZ: -84,
  maxZ: 21,
};

export const SPAWN: SpawnDef = {
  position: [0, 17],
  yawDegrees: 0, // facing north, up the avenue
};

// ===========================================================================
// 2. Ground patches (lawns and bare laterite earth)
// ===========================================================================

export interface GroundPatchDef {
  readonly id: string;
  readonly centre: Vec2Tuple;
  readonly size: readonly [width: number, depth: number];
  readonly rotationY: number;
  readonly material: MaterialKey;
  /** Draw order nudge, in metres. Higher patches paint over lower ones. */
  readonly layer: number;
}

export const GROUND_PATCHES: readonly GroundPatchDef[] = [
  // Red laterite forecourt just inside the gate — very West African.
  { id: 'gate-forecourt', centre: [0, 17], size: [46, 10], rotationY: 0, material: 'laterite', layer: 1 },
  // Lawns flanking the avenue.
  { id: 'lawn-avenue-west', centre: [-24, 2], size: [36, 30], rotationY: 0, material: 'lawn', layer: 1 },
  { id: 'lawn-avenue-east', centre: [24, 2], size: [36, 30], rotationY: 0, material: 'lawn', layer: 1 },
  // Quad lawns between the courtyard and the flanking blocks.
  { id: 'lawn-west-quad', centre: [-23, -8], size: [24, 10], rotationY: 0, material: 'lawn', layer: 1 },
  { id: 'lawn-east-quad', centre: [23, -8], size: [24, 10], rotationY: 0, material: 'lawn', layer: 1 },
  // Big lawns in front of the Great Hall, flanked by Engineering and Library.
  { id: 'lawn-great-hall-west', centre: [-30, -40], size: [28, 14], rotationY: 0, material: 'lawn', layer: 1 },
  { id: 'lawn-great-hall-east', centre: [30, -40], size: [28, 14], rotationY: 0, material: 'lawn', layer: 1 },
  { id: 'lawn-north-west', centre: [-34, -78], size: [40, 10], rotationY: 0, material: 'lawn', layer: 1 },
  { id: 'lawn-north-east', centre: [34, -78], size: [40, 10], rotationY: 0, material: 'lawn', layer: 1 },
];

// ===========================================================================
// 3. Paved walkways
// ===========================================================================

export interface WalkwayDef {
  readonly id: string;
  readonly centre: Vec2Tuple;
  readonly size: readonly [width: number, depth: number];
  readonly rotationY: number;
  readonly material: MaterialKey;
  /** Adds a raised whitewashed kerb along the long edges. */
  readonly kerb: boolean;
}

export const WALKWAYS: readonly WalkwayDef[] = [
  { id: 'main-avenue', centre: [0, 4], size: [11, 34], rotationY: 0, material: 'pavingLight', kerb: true },
  { id: 'courtyard', centre: [0, -30], size: [40, 38], rotationY: 0, material: 'pavingDark', kerb: false },
  { id: 'courtyard-inlay', centre: [0, -30], size: [13, 13], rotationY: 45, material: 'pavingLight', kerb: false },
  { id: 'west-spur', centre: [-23, -30], size: [7, 14], rotationY: 0, material: 'pavingLight', kerb: true },
  { id: 'east-spur', centre: [23, -30], size: [7, 14], rotationY: 0, material: 'pavingLight', kerb: true },
  { id: 'north-cross', centre: [0, -52], size: [84, 7], rotationY: 0, material: 'pavingLight', kerb: true },
  { id: 'students-centre-path', centre: [-14, 6], size: [20, 6], rotationY: 0, material: 'pavingLight', kerb: false },
  { id: 'lodge-path', centre: [9, 16], size: [10, 5], rotationY: 0, material: 'pavingLight', kerb: false },
];

// ===========================================================================
// 4. Buildings
// ===========================================================================

export type RoofStyle = 'gable' | 'hip' | 'flat';
export type VerandahStyle = 'none' | 'front' | 'front-and-back' | 'wrap';

export interface BuildingPlaque {
  readonly title: string;
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
}

export interface BuildingDef {
  readonly id: string;
  readonly name: string;
  readonly kind: 'lecture' | 'hall' | 'library' | 'service' | 'lodge';
  /** Footprint centre, `[x, z]`. */
  readonly position: Vec2Tuple;
  /** `[width (X), wall height, depth (Z)]` before rotation. */
  readonly size: SizeTuple;
  readonly rotationY: number;
  /** Drives the window grid only — the wall height above is authoritative. */
  readonly storeys: number;
  readonly walls: MaterialKey;
  readonly trim: MaterialKey;
  readonly roof: MaterialKey;
  readonly roofStyle: RoofStyle;
  /** Ridge height above the eaves, in metres. Ignored for `flat`. */
  readonly roofPitch: number;
  /** Deep shaded colonnades — the defining feature of tropical campus blocks. */
  readonly verandah: VerandahStyle;
  /** Painted kente band between the storeys. */
  readonly kenteBand: boolean;
  /** Readable plaque beside the main entrance. `null` = no plaque. */
  readonly plaque: BuildingPlaque | null;
  /**
   * When the artist delivers a real model, add it to `MODEL_ASSETS` and name the
   * key here. Placeholder geometry is then skipped for this building.
   */
  readonly model: ModelKey | null;
}

export const BUILDINGS: readonly BuildingDef[] = [
  {
    id: 'great-hall',
    name: 'Independence Great Hall',
    kind: 'hall',
    position: [0, -67],
    size: [38, 15, 22],
    rotationY: 0,
    storeys: 2,
    walls: 'wallWhitewash',
    trim: 'wallTerracotta',
    roof: 'roofOxide',
    roofStyle: 'gable',
    roofPitch: 5.5,
    verandah: 'front',
    kenteBand: true,
    plaque: {
      title: 'Independence Great Hall',
      body: [
        'Matriculation, congregation and the end-of-semester hall week durbar all happen here.',
        'The deep front colonnade is doing real work: it keeps the midday sun off the walls and gives students somewhere dry to wait out an afternoon downpour.',
      ],
      bullets: [
        'Capacity: 1,800 seated',
        'Built: placeholder geometry — awaiting the artist model',
      ],
    },
    model: null,
  },
  {
    id: 'lecture-nkrumah',
    name: 'Nkrumah Lecture Block',
    kind: 'lecture',
    position: [-34, -30],
    // Local axes: 30 m of frontage, 16 m deep. rotationY 90 swings the verandah
    // round to face EAST, onto the courtyard.
    size: [30, 11, 16],
    rotationY: 90,
    storeys: 3,
    walls: 'wallOchre',
    trim: 'wallWhitewash',
    roof: 'roofZinc',
    roofStyle: 'gable',
    roofPitch: 3,
    verandah: 'front',
    kenteBand: false,
    plaque: {
      title: 'Nkrumah Lecture Block',
      body: [
        'Three floors of tiered lecture theatres, numbered NLB 101 through NLB 312.',
        'Every room opens onto the verandah rather than an internal corridor, so the cross-breeze does the work of air conditioning.',
      ],
      bullets: ['Theatres: 12', 'Largest room: NLB 101, 400 seats'],
    },
    model: null,
  },
  {
    id: 'science-asantewaa',
    name: 'Yaa Asantewaa Science Block',
    kind: 'lecture',
    position: [34, -30],
    // Mirror of the Nkrumah block: verandah faces WEST, onto the courtyard.
    size: [30, 11, 16],
    rotationY: -90,
    storeys: 3,
    walls: 'wallSandcrete',
    trim: 'wallWhitewash',
    roof: 'roofZinc',
    roofStyle: 'gable',
    roofPitch: 3,
    verandah: 'front',
    kenteBand: true,
    plaque: {
      title: 'Yaa Asantewaa Science Block',
      body: [
        'Teaching laboratories for chemistry, physics and biology, plus the departmental offices on the top floor.',
        'The louvred breeze-block screens on the north wall vent the labs without letting the afternoon sun in.',
      ],
      bullets: ['Teaching labs: 9', 'Fume cupboards: 14'],
    },
    model: null,
  },
  {
    id: 'engineering',
    name: 'Faculty of Engineering',
    kind: 'lecture',
    position: [-34, -64],
    size: [24, 11, 16],
    rotationY: 0,
    storeys: 2,
    walls: 'wallTerracotta',
    trim: 'wallWhitewash',
    roof: 'roofRust',
    roofStyle: 'hip',
    roofPitch: 4,
    verandah: 'front-and-back',
    kenteBand: false,
    plaque: {
      title: 'Faculty of Engineering',
      body: [
        'Workshops on the ground floor, drawing studios above. The roller doors on the west face open straight onto the yard so machinery can be rolled in and out.',
      ],
      bullets: ['Departments: Civil, Mechanical, Electrical, Geomatic'],
    },
    model: null,
  },
  {
    id: 'library',
    name: 'Ananse Memorial Library',
    kind: 'library',
    position: [34, -64],
    size: [24, 13, 16],
    rotationY: 0,
    storeys: 3,
    walls: 'wallWhitewash',
    trim: 'wallOchre',
    roof: 'roofOxide',
    roofStyle: 'hip',
    roofPitch: 4.5,
    verandah: 'wrap',
    kenteBand: true,
    plaque: {
      title: 'Ananse Memorial Library',
      body: [
        'Open 07:00 to 22:00 in term time, and the only building on campus with a generator big enough to keep the lights on through a power cut.',
        'The Ghana Collection on the second floor holds the university archives.',
      ],
      bullets: ['Seats: 600', 'Reading rooms: 4', 'Wi-Fi: yes, when it feels like it'],
    },
    model: null,
  },
  {
    id: 'students-centre',
    name: "Students' Centre & Chop Bar",
    kind: 'service',
    position: [-32, 6],
    // Verandah faces EAST, towards the avenue and the path from the gate.
    size: [12, 8, 18],
    rotationY: 90,
    storeys: 2,
    walls: 'wallOchre',
    trim: 'wallTerracotta',
    roof: 'roofZinc',
    roofStyle: 'gable',
    roofPitch: 2.6,
    verandah: 'wrap',
    kenteBand: true,
    plaque: {
      title: "Students' Centre & Chop Bar",
      body: [
        'Waakye in the morning, red-red at lunch, jollof whenever the kitchen feels generous. The SRC offices are upstairs.',
        'In a later phase this is where the hunger, money and social systems will meet.',
      ],
      bullets: ['Opens: 06:30', 'Phase 2: hunger and spending systems hook in here'],
    },
    model: null,
  },
  {
    id: 'porters-lodge',
    name: "Porter's Lodge",
    kind: 'lodge',
    position: [15, 16],
    // The counter faces WEST, so the porter can see everyone coming through.
    size: [7, 4.5, 8],
    rotationY: -90,
    storeys: 1,
    walls: 'wallWhitewash',
    trim: 'kenteGreen',
    roof: 'roofRust',
    roofStyle: 'hip',
    roofPitch: 1.8,
    verandah: 'front',
    kenteBand: false,
    plaque: {
      title: "Porter's Lodge",
      body: [
        'Nothing comes onto campus without passing the porter. Lost ID cards, visitor sign-in and the key cabinet all live behind this counter.',
      ],
    },
    model: null,
  },
];

// ===========================================================================
// 5. Entrance gate and boundary wall
// ===========================================================================

export interface GateDef {
  readonly id: string;
  readonly centre: Vec2Tuple;
  readonly rotationY: number;
  /** Clear opening between the inner faces of the pillars. */
  readonly openingWidth: number;
  readonly pillarWidth: number;
  readonly pillarHeight: number;
  /** Height of the lintel/arch above the ground. */
  readonly archHeight: number;
  readonly archThickness: number;
  readonly pillarMaterial: MaterialKey;
  readonly archMaterial: MaterialKey;
}

export const GATE: GateDef = {
  id: 'main-gate',
  centre: [0, 20],
  rotationY: 0,
  openingWidth: 12,
  pillarWidth: 1.8,
  pillarHeight: 6.2,
  archHeight: 6.6,
  archThickness: 0.9,
  pillarMaterial: 'wallTerracotta',
  archMaterial: 'wallWhitewash',
};

export interface WallSegmentDef {
  readonly id: string;
  readonly from: Vec2Tuple;
  readonly to: Vec2Tuple;
  readonly height: number;
  readonly thickness: number;
  readonly material: MaterialKey;
  /** Adds square pillars at a fixed interval, in metres. 0 = none. */
  readonly pillarEvery: number;
}

export const BOUNDARY_WALLS: readonly WallSegmentDef[] = [
  { id: 'wall-south-west', from: [-56, 21], to: [-7, 21], height: 2.4, thickness: 0.4, material: 'wallOchre', pillarEvery: 12 },
  { id: 'wall-south-east', from: [7, 21], to: [56, 21], height: 2.4, thickness: 0.4, material: 'wallOchre', pillarEvery: 12 },
  { id: 'wall-west', from: [-56, 21], to: [-56, -84], height: 2.4, thickness: 0.4, material: 'wallOchre', pillarEvery: 14 },
  { id: 'wall-east', from: [56, 21], to: [56, -84], height: 2.4, thickness: 0.4, material: 'wallOchre', pillarEvery: 14 },
  { id: 'wall-north', from: [-56, -84], to: [56, -84], height: 2.4, thickness: 0.4, material: 'wallOchre', pillarEvery: 14 },
];

export interface HedgeDef {
  readonly id: string;
  readonly from: Vec2Tuple;
  readonly to: Vec2Tuple;
  readonly height: number;
  readonly thickness: number;
}

export const HEDGES: readonly HedgeDef[] = [
  { id: 'hedge-avenue-west', from: [-6.5, 18], to: [-6.5, -11], height: 0.85, thickness: 1 },
  { id: 'hedge-avenue-east', from: [6.5, 18], to: [6.5, -11], height: 0.85, thickness: 1 },
  { id: 'hedge-courtyard-north', from: [-20, -49.5], to: [-5, -49.5], height: 0.7, thickness: 0.9 },
  { id: 'hedge-courtyard-north-east', from: [5, -49.5], to: [20, -49.5], height: 0.7, thickness: 0.9 },
];

// ===========================================================================
// 6. Planting
// ===========================================================================

export type TreeSpecies = 'palm' | 'mango' | 'neem' | 'flamboyant' | 'banana';

export interface TreeDef {
  readonly id: string;
  readonly species: TreeSpecies;
  readonly position: Vec2Tuple;
  /** 1 = the species' default size. */
  readonly scale: number;
  readonly rotationY: number;
}

/**
 * Hand-placed trees: the avenue palms, courtyard shade trees and the big
 * flamboyants by the Great Hall. Background planting is filled in by
 * `TREE_SCATTER_ZONES` below so this list stays short enough to edit by hand.
 */
export const TREES: readonly TreeDef[] = [
  // Avenue of royal palms, mirrored either side of the main walk.
  { id: 'palm-w1', species: 'palm', position: [-8.5, 17], scale: 1.05, rotationY: 12 },
  { id: 'palm-w2', species: 'palm', position: [-8.5, 10], scale: 0.95, rotationY: 48 },
  { id: 'palm-w3', species: 'palm', position: [-8.5, 3], scale: 1.1, rotationY: 95 },
  { id: 'palm-w4', species: 'palm', position: [-8.5, -4], scale: 1, rotationY: 140 },
  { id: 'palm-e1', species: 'palm', position: [8.5, 17], scale: 1, rotationY: 200 },
  { id: 'palm-e2', species: 'palm', position: [8.5, 10], scale: 1.08, rotationY: 245 },
  { id: 'palm-e3', species: 'palm', position: [8.5, 3], scale: 0.94, rotationY: 290 },
  { id: 'palm-e4', species: 'palm', position: [8.5, -4], scale: 1.04, rotationY: 330 },

  // Courtyard shade: mango and neem at the four corners of the plaza.
  { id: 'mango-court-sw', species: 'mango', position: [-16, -14], scale: 1.15, rotationY: 20 },
  { id: 'mango-court-se', species: 'mango', position: [16, -14], scale: 1.1, rotationY: 150 },
  { id: 'neem-court-nw', species: 'neem', position: [-16, -46], scale: 1.05, rotationY: 70 },
  { id: 'neem-court-ne', species: 'neem', position: [16, -46], scale: 1.12, rotationY: 240 },
  { id: 'mango-court-mid-w', species: 'mango', position: [-22, -30], scale: 0.9, rotationY: 300 },
  { id: 'mango-court-mid-e', species: 'mango', position: [22, -30], scale: 0.95, rotationY: 110 },

  // Flamboyants (flame trees) framing the Great Hall forecourt.
  { id: 'flam-hall-w', species: 'flamboyant', position: [-24, -54], scale: 1.2, rotationY: 30 },
  { id: 'flam-hall-e', species: 'flamboyant', position: [24, -54], scale: 1.18, rotationY: 210 },
  { id: 'flam-gate-w', species: 'flamboyant', position: [-16, 14], scale: 1, rotationY: 95 },
  { id: 'flam-gate-e', species: 'flamboyant', position: [16, 14], scale: 1.05, rotationY: 275 },

  // Chop bar shade and a stand of banana behind the Students' Centre.
  { id: 'neem-chopbar', species: 'neem', position: [-22, 14], scale: 1, rotationY: 55 },
  { id: 'banana-1', species: 'banana', position: [-44, 14], scale: 1, rotationY: 10 },
  { id: 'banana-2', species: 'banana', position: [-41, 16], scale: 0.9, rotationY: 120 },
  { id: 'banana-3', species: 'banana', position: [-46, 17], scale: 1.05, rotationY: 230 },

  // Lodge and east lawn.
  { id: 'mango-lodge', species: 'mango', position: [24, 15], scale: 1, rotationY: 165 },
  { id: 'neem-east-lawn', species: 'neem', position: [34, 4], scale: 1.1, rotationY: 20 },
  { id: 'neem-west-lawn', species: 'neem', position: [-34, -8], scale: 1.05, rotationY: 280 },
];

export interface TreeScatterZoneDef {
  readonly id: string;
  readonly centre: Vec2Tuple;
  readonly size: readonly [width: number, depth: number];
  readonly species: readonly TreeSpecies[];
  /** Target count at `scatterDensity: 1`. Low quality plants fewer. */
  readonly count: number;
  /** Any integer. Same seed = same campus, every single load. */
  readonly seed: number;
  readonly minScale: number;
  readonly maxScale: number;
  /** Rejects positions this close to an existing collider or walkway. */
  readonly clearance: number;
}

export const TREE_SCATTER_ZONES: readonly TreeScatterZoneDef[] = [
  {
    id: 'scatter-north-belt',
    centre: [0, -78.5],
    size: [104, 11],
    species: ['neem', 'mango', 'palm'],
    count: 16,
    seed: 1957,
    minScale: 0.8,
    maxScale: 1.25,
    clearance: 2.5,
  },
  {
    id: 'scatter-west-belt',
    centre: [-50, -30],
    size: [12, 100],
    species: ['neem', 'mango'],
    count: 14,
    seed: 6957,
    minScale: 0.85,
    maxScale: 1.3,
    clearance: 2.5,
  },
  {
    id: 'scatter-east-belt',
    centre: [50, -30],
    size: [12, 100],
    species: ['neem', 'mango'],
    count: 14,
    seed: 2460,
    minScale: 0.85,
    maxScale: 1.3,
    clearance: 2.5,
  },
  {
    id: 'scatter-great-hall-lawns',
    centre: [0, -40],
    size: [96, 14],
    species: ['flamboyant', 'mango'],
    count: 8,
    seed: 777,
    minScale: 0.85,
    maxScale: 1.15,
    clearance: 4,
  },
  {
    id: 'scatter-entrance-lawns',
    centre: [0, 4],
    size: [100, 28],
    species: ['neem', 'banana', 'mango'],
    count: 10,
    seed: 2024,
    minScale: 0.8,
    maxScale: 1.1,
    clearance: 4,
  },
];

// ===========================================================================
// 7. Street furniture
// ===========================================================================

export interface BenchDef {
  readonly id: string;
  readonly position: Vec2Tuple;
  readonly rotationY: number;
  readonly style: 'wood' | 'concrete';
}

export const BENCHES: readonly BenchDef[] = [
  { id: 'bench-avenue-w1', position: [-7.8, 13], rotationY: 90, style: 'wood' },
  { id: 'bench-avenue-w2', position: [-7.8, 0], rotationY: 90, style: 'wood' },
  { id: 'bench-avenue-e1', position: [7.8, 13], rotationY: 270, style: 'wood' },
  { id: 'bench-avenue-e2', position: [7.8, 0], rotationY: 270, style: 'wood' },
  { id: 'bench-court-s1', position: [-6, -13.5], rotationY: 0, style: 'concrete' },
  { id: 'bench-court-s2', position: [6, -13.5], rotationY: 0, style: 'concrete' },
  { id: 'bench-court-n1', position: [-6, -46.5], rotationY: 180, style: 'concrete' },
  { id: 'bench-court-n2', position: [6, -46.5], rotationY: 180, style: 'concrete' },
  { id: 'bench-court-w', position: [-18.5, -30], rotationY: 90, style: 'wood' },
  { id: 'bench-court-e', position: [18.5, -30], rotationY: 270, style: 'wood' },
  { id: 'bench-hall-w', position: [-12, -53], rotationY: 180, style: 'concrete' },
  { id: 'bench-hall-e', position: [12, -53], rotationY: 180, style: 'concrete' },
  { id: 'bench-chopbar', position: [-24, 11], rotationY: 250, style: 'wood' },
];

export interface LampDef {
  readonly id: string;
  readonly position: Vec2Tuple;
  readonly height: number;
}

export const LAMPS: readonly LampDef[] = [
  { id: 'lamp-av-w1', position: [-6, 16], height: 4.6 },
  { id: 'lamp-av-w2', position: [-6, 6], height: 4.6 },
  { id: 'lamp-av-w3', position: [-6, -8], height: 4.6 },
  { id: 'lamp-av-e1', position: [6, 16], height: 4.6 },
  { id: 'lamp-av-e2', position: [6, 6], height: 4.6 },
  { id: 'lamp-av-e3', position: [6, -8], height: 4.6 },
  { id: 'lamp-court-sw', position: [-19, -12.5], height: 5 },
  { id: 'lamp-court-se', position: [19, -12.5], height: 5 },
  { id: 'lamp-court-nw', position: [-19, -47.5], height: 5 },
  { id: 'lamp-court-ne', position: [19, -47.5], height: 5 },
  { id: 'lamp-cross-w', position: [-30, -48], height: 5 },
  { id: 'lamp-cross-e', position: [30, -48], height: 5 },
];

export interface FlagpoleDef {
  readonly id: string;
  readonly position: Vec2Tuple;
  readonly height: number;
}

export const FLAGPOLES: readonly FlagpoleDef[] = [
  { id: 'flag-court-centre', position: [0, -30], height: 11 },
];

export interface PlanterDef {
  readonly id: string;
  readonly centre: Vec2Tuple;
  readonly size: readonly [width: number, depth: number];
  readonly height: number;
  readonly rotationY: number;
}

export const PLANTERS: readonly PlanterDef[] = [
  { id: 'planter-court-nw', centre: [-13, -24], size: [3.4, 3.4], height: 0.55, rotationY: 0 },
  { id: 'planter-court-ne', centre: [13, -24], size: [3.4, 3.4], height: 0.55, rotationY: 0 },
  { id: 'planter-court-sw', centre: [-13, -36], size: [3.4, 3.4], height: 0.55, rotationY: 0 },
  { id: 'planter-court-se', centre: [13, -36], size: [3.4, 3.4], height: 0.55, rotationY: 0 },
  { id: 'planter-gate-w', centre: [-10, 19], size: [5, 2.4], height: 0.5, rotationY: 0 },
  { id: 'planter-gate-e', centre: [10, 19], size: [5, 2.4], height: 0.5, rotationY: 0 },
];

// ===========================================================================
// 8. Signage (the interactive objects)
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
  /** Drives the geometry: a big double-post board, a slim post, or a notice box. */
  readonly kind: 'campus-board' | 'directory' | 'notice';
  readonly position: Vec2Tuple;
  readonly rotationY: number;
  readonly scale: number;
  readonly interactionRadius: number;
  readonly interaction: SignInteractionDef;
}

export const SIGNS: readonly SignDef[] = [
  {
    // THE main campus sign, just inside the gate and directly in the player's
    // line of sight when they spawn.
    id: 'campus-welcome-sign',
    kind: 'campus-board',
    position: [-9, 13.5],
    rotationY: 20,
    scale: 1,
    interactionRadius: 4.2,
    interaction: {
      promptLabel: 'Read the campus sign',
      eyebrow: 'Campus Sign',
      title: 'Akwaaba — Welcome to Campus',
      body: [
        'You are standing at the main gate. The avenue ahead runs north to the courtyard, where the four teaching blocks meet.',
        'This is the Phase 1 prototype: the ground, buildings, trees and benches are all placeholder geometry, generated from the data files in src/config. Everything you can see is meant to be replaced by the artist model and campus map.',
      ],
      bullets: [
        'North, up the avenue — Courtyard and the Great Hall',
        'West — Nkrumah Lecture Block and the Faculty of Engineering',
        'East — Yaa Asantewaa Science Block and Ananse Memorial Library',
        "South-west — Students' Centre and Chop Bar",
      ],
    },
  },
  {
    id: 'courtyard-directory',
    kind: 'directory',
    position: [3.5, -26],
    rotationY: 196,
    scale: 1,
    interactionRadius: 3.4,
    interaction: {
      promptLabel: 'Read the directory',
      eyebrow: 'Courtyard Directory',
      title: 'Courtyard Directory',
      body: [
        'The courtyard is the crossroads of the campus. Lectures to the east and west, ceremonies to the north, the gate to the south.',
      ],
      bullets: [
        'Great Hall — straight ahead (north)',
        'Library — right, then left at the cross path',
        'Engineering — left, then right at the cross path',
        'Chop bar — back down the avenue and turn right',
      ],
    },
  },
  {
    id: 'src-notice-board',
    kind: 'notice',
    position: [-5.2, -14.2],
    rotationY: 8,
    scale: 1,
    interactionRadius: 3,
    interaction: {
      promptLabel: 'Read the notice board',
      eyebrow: 'SRC Notice Board',
      title: 'SRC Notice Board',
      body: ['Hand-written and stapled over each other, three deep.'],
      bullets: [
        'HALL WEEK — jollof cook-off, Saturday, 6 p.m.',
        'LOST: one ID card, name worn off. See the porter.',
        'TUTORIAL MOVED: NLB 204, not NLB 104. Again.',
        'Phase 2 will turn these into real quests and timetabled events.',
      ],
    },
  },
  {
    id: 'lodge-notice',
    kind: 'notice',
    position: [11.5, 14],
    rotationY: 290,
    scale: 0.9,
    interactionRadius: 3,
    interaction: {
      promptLabel: 'Read the lodge notice',
      eyebrow: "Porter's Lodge",
      title: 'Visitor Sign-In',
      body: [
        'All visitors report to the lodge. No ID card, no entry — and the porter has heard every excuse already.',
      ],
      bullets: ['Gate closes: 22:00', 'Late entry: sign the book'],
    },
  },
];

// ===========================================================================
// 9. HUD location zones
// ===========================================================================

export const ZONES: readonly ZoneDef[] = [
  { id: 'zone-default', name: 'Campus Grounds', centre: [0, -30], size: [120, 120], priority: 0 },
  { id: 'zone-entrance', name: 'Campus Entrance', centre: [0, 15], size: [46, 16], priority: 2 },
  { id: 'zone-avenue', name: 'Main Avenue', centre: [0, 2], size: [18, 32], priority: 1 },
  { id: 'zone-courtyard', name: 'Courtyard', centre: [0, -30], size: [44, 42], priority: 2 },
  { id: 'zone-hall-forecourt', name: 'Great Hall Forecourt', centre: [0, -53], size: [44, 12], priority: 3 },
  { id: 'zone-west-quad', name: 'Nkrumah Lecture Block', centre: [-34, -30], size: [22, 34], priority: 3 },
  { id: 'zone-east-quad', name: 'Yaa Asantewaa Science Block', centre: [34, -30], size: [22, 34], priority: 3 },
  { id: 'zone-engineering', name: 'Faculty of Engineering', centre: [-34, -62], size: [30, 24], priority: 3 },
  { id: 'zone-library', name: 'Ananse Memorial Library', centre: [34, -62], size: [30, 24], priority: 3 },
  { id: 'zone-chopbar', name: "Students' Centre", centre: [-30, 6], size: [28, 20], priority: 3 },
  { id: 'zone-lodge', name: "Porter's Lodge", centre: [15, 16], size: [16, 14], priority: 3 },
];
