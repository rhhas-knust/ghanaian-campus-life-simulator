/**
 * Interiors — EDITABLE DATA FILE.
 *
 * Each interior is a small floor plan in its own LOCAL metres (+X east, +Z
 * south, origin wherever is convenient). It is built only while the player is
 * inside it, and the campus is hidden meanwhile, so interiors never need to fit
 * between the campus buildings.
 *
 * Walls are axis-aligned segments; an `opening` is a doorway the player can
 * walk through, a `window` is a lit pane on the wall. Closed `doors` are
 * painted on a wall and can be knocked on. Furniture is `props`; anything a
 * mission needs (the bed, the wardrobe, the lost-property cabinet) is a story
 * place in `src/story/data/places.ts`, so this file stays pure scenery.
 *
 * `ENTRANCES` connect the campus to an interior: where the door is outside, and
 * where the player stands on each side of it.
 */

import type { Condition } from '../story/types';
import type { Vec2Tuple } from '../types';
import { planPoint, type PlanPoint } from './campusLayout';
import type { MaterialKey } from './palette';

export type InteriorId = 'hostel-a-2f' | 'porters-lodge';
/** The campus, or one of the interiors. */
export type LocationId = 'campus' | InteriorId;

/** `[x0, z0, x1, z1]` in local metres. */
export type LocalRect = readonly [x0: number, z0: number, x1: number, z1: number];

export interface InteriorRoomDef {
  readonly id: string;
  /** Shown in the location pill and on the minimap. */
  readonly name: string;
  readonly rect: LocalRect;
  readonly floor: MaterialKey;
  /**
   * The doorway into this room. Objective guidance points here first when the
   * target is in this room and the player is not, so the marker never points
   * through a wall. `null` for open areas such as the corridor.
   */
  readonly door: Vec2Tuple | null;
  /** Short label for the minimap. */
  readonly mapLabel?: string;
}

export interface WallDef {
  readonly from: Vec2Tuple;
  readonly to: Vec2Tuple;
  /** Doorways: `at` is the centre, measured along the wall's own axis (x or z). */
  readonly openings?: readonly { readonly at: number; readonly width: number }[];
  readonly windows?: readonly { readonly at: number; readonly width: number }[];
}

export type DoorFacing = 'north' | 'south' | 'east' | 'west';

/** A closed door painted on a wall: decoration, a number plate and a knock. */
export interface ClosedDoorDef {
  readonly at: Vec2Tuple;
  /** Which way the door's face looks — towards the side the player stands on. */
  readonly facing: DoorFacing;
  readonly label: string;
  readonly knock: readonly string[];
}

export type PropKind =
  | 'bed'
  | 'desk'
  | 'chair'
  | 'wardrobe'
  | 'toolTable'
  | 'bucket'
  | 'suitcase'
  | 'poster'
  | 'fan'
  | 'looseTile'
  | 'sofa'
  | 'tv'
  | 'table'
  | 'noticeBoard'
  | 'waterDispenser'
  | 'stairwell'
  | 'counter'
  | 'keyBoard'
  | 'cabinet'
  | 'shelf'
  | 'openDoor';

export interface PropDef {
  readonly kind: PropKind;
  readonly at: Vec2Tuple;
  /** DEGREES. At 0 the prop's front faces +Z (south). */
  readonly rotationY: number;
  /** Bedding, poster or sofa colour. */
  readonly colour?: MaterialKey;
  /** Lettering, for notice boards and cabinets. */
  readonly label?: string;
}

export interface InteriorExitDef {
  readonly at: Vec2Tuple;
  readonly radius: number;
  readonly promptLabel: string;
  /** The entrance this exit leads back out through. */
  readonly entrance: EntranceId;
}

export interface InteriorDef {
  readonly id: InteriorId;
  readonly name: string;
  /** The player is clamped inside this rectangle; walls do the real work. */
  readonly bounds: LocalRect;
  readonly wallHeight: number;
  readonly rooms: readonly InteriorRoomDef[];
  readonly walls: readonly WallDef[];
  readonly doors: readonly ClosedDoorDef[];
  readonly props: readonly PropDef[];
  /** Ceiling lights: a glowing panel each, no real light source. */
  readonly lights: readonly Vec2Tuple[];
  readonly exits: readonly InteriorExitDef[];
}

// ===========================================================================
// Hastech Hostels, Block A — second floor
// ===========================================================================
//
//   x: -16 ........ -12 .............................. 8 ..... 12 ... 14 ...... 20
//      | stairwell  |  A-203 A-205 A-207 A-209 A-211 A-213  | wash |           |
//      |------------+---------------------------------------+------|  common   |
//      |                      corridor                              |   room    |
//      |------------------------------------------+ door +--------|           |
//      | A-202 | A-204 A-206 A-208 A-210 A-212    | A-214 | store |           |
//
// Only A-214, the corridor, the stairwell and the common room are built. The
// other rooms are closed doors: the corridor walls are their boundary.

const HOSTEL_DOOR_NORTH = (x: number, label: string, knock: string): ClosedDoorDef => ({
  at: [x, -1.25],
  facing: 'south',
  label,
  knock: [knock],
});
const HOSTEL_DOOR_SOUTH = (x: number, label: string, knock: string): ClosedDoorDef => ({
  at: [x, 1.25],
  facing: 'north',
  label,
  knock: [knock],
});

const HOSTEL_A_2F: InteriorDef = {
  id: 'hostel-a-2f',
  name: 'Hastech Block A · Second floor',
  bounds: [-16, -5.5, 20, 5.5],
  wallHeight: 3,
  rooms: [
    { id: 'stairwell', name: 'Block A · Stairwell', rect: [-16, -5.5, -12, -1.25], floor: 'concrete', door: null, mapLabel: 'STAIRS' },
    { id: 'corridor', name: 'Block A · Second floor', rect: [-16, -1.25, 14, 1.25], floor: 'floorTerrazzo', door: null },
    { id: 'a214', name: 'Room A-214', rect: [8, 1.25, 12, 5.5], floor: 'floorTile', door: [9, 1.25], mapLabel: 'A-214' },
    { id: 'common', name: 'Block A · Common room', rect: [14, -5.5, 20, 5.5], floor: 'floorTile', door: [14, 0], mapLabel: 'COMMON' },
  ],
  walls: [
    // Corridor
    { from: [-12, -1.25], to: [14, -1.25] },
    { from: [-16, 1.25], to: [14, 1.25], openings: [{ at: 9, width: 1 }] },
    { from: [-16, -5.5], to: [-16, 1.25], windows: [{ at: 0, width: 1.2 }, { at: -3.6, width: 1.2 }] },
    // Stairwell
    { from: [-16, -5.5], to: [-12, -5.5] },
    { from: [-12, -5.5], to: [-12, -1.25] },
    // Room A-214
    { from: [8, 1.25], to: [8, 5.5] },
    { from: [12, 1.25], to: [12, 5.5] },
    { from: [8, 5.5], to: [12, 5.5], windows: [{ at: 10, width: 1.3 }] },
    // Common room: open to the corridor across its full width
    { from: [14, -5.5], to: [14, -1.25] },
    { from: [14, 1.25], to: [14, 5.5] },
    { from: [14, -5.5], to: [20, -5.5] },
    { from: [14, 5.5], to: [20, 5.5], windows: [{ at: 17, width: 2 }] },
    { from: [20, -5.5], to: [20, 5.5], windows: [{ at: -3, width: 1.6 }, { at: 3, width: 1.6 }] },
  ],
  doors: [
    HOSTEL_DOOR_NORTH(-10.8, 'A-203', 'Highlife behind the door, loud. Nobody answers.'),
    HOSTEL_DOOR_NORTH(-6.8, 'A-205', 'A sheet taped to the door: "Fellowship tonight, 7 p.m., common room. All welcome."'),
    HOSTEL_DOOR_NORTH(-2.8, 'A-207', 'The smell of jollof comes from under the door. Your stomach notices.'),
    HOSTEL_DOOR_NORTH(1.2, 'A-209', 'Silence, and a "Do not disturb — exam prep" sign left over from last semester.'),
    HOSTEL_DOOR_NORTH(5.2, 'A-211', 'Locked.'),
    HOSTEL_DOOR_NORTH(9.2, 'A-213', 'Locked. The number plate hangs by one screw.'),
    HOSTEL_DOOR_NORTH(13, 'WASHROOM', 'The washrooms. A hand-written sign: "No water until 5 a.m. Buckets only."'),
    HOSTEL_DOOR_SOUTH(-14.8, 'A-202', 'Locked. A note: "Gone home for the weekend. Do NOT touch my bucket."'),
    HOSTEL_DOOR_SOUTH(-10.8, 'A-204', 'You knock. "I\'m reading!" comes the answer. You leave them to it.'),
    HOSTEL_DOOR_SOUTH(-6.8, 'A-206', 'Locked. Two pairs of slippers wait outside the door.'),
    HOSTEL_DOOR_SOUTH(-2.8, 'A-208', 'Chalked on the door: "Fiifi & Paa". Nobody home.'),
    HOSTEL_DOOR_SOUTH(1.2, 'A-210', 'Someone is on a phone call in Ewe. You do not knock.'),
    HOSTEL_DOOR_SOUTH(5.2, 'A-212', 'Your neighbours. A Block A football scarf hangs on the handle.'),
    HOSTEL_DOOR_SOUTH(13, 'STORE', 'The caretaker\'s store. Locked. A faded notice: "Room clearances — enquire at the Porter\'s Lodge."'),
  ],
  props: [
    { kind: 'stairwell', at: [-14, -4.25], rotationY: 0 },
    // Room A-214: your bed on the east wall, Nii's on the west.
    { kind: 'openDoor', at: [8.52, 1.8], rotationY: 0 },
    { kind: 'bed', at: [11.47, 4.45], rotationY: 0, colour: 'fabricBlue' },
    { kind: 'bed', at: [8.53, 4.45], rotationY: 0, colour: 'fabricOrange' },
    { kind: 'desk', at: [10, 5.17], rotationY: 180 },
    { kind: 'chair', at: [10, 4.5], rotationY: 0 },
    { kind: 'wardrobe', at: [11.45, 1.62], rotationY: 0 },
    { kind: 'toolTable', at: [8.33, 2.75], rotationY: 90 },
    { kind: 'suitcase', at: [11.4, 3.05], rotationY: 90 },
    { kind: 'bucket', at: [9.9, 1.55], rotationY: 0, colour: 'plasticBlue' },
    { kind: 'bucket', at: [10.35, 1.55], rotationY: 0, colour: 'kenteRed' },
    { kind: 'poster', at: [11.9, 4.4], rotationY: -90, colour: 'kenteGreen' },
    { kind: 'poster', at: [8.1, 4.4], rotationY: 90, colour: 'fabricOrange' },
    { kind: 'looseTile', at: [10.55, 4.25], rotationY: 0 },
    { kind: 'fan', at: [10, 3.4], rotationY: 0 },
    // Corridor: buckets queue outside the washroom.
    { kind: 'bucket', at: [12.3, -0.95], rotationY: 0, colour: 'plasticBlue' },
    { kind: 'bucket', at: [12.75, -0.95], rotationY: 0, colour: 'kenteGold' },
    { kind: 'bucket', at: [13.2, -0.95], rotationY: 0, colour: 'kenteRed' },
    // Common room
    { kind: 'tv', at: [19.65, 0], rotationY: -90 },
    { kind: 'sofa', at: [16, -1.7], rotationY: 90, colour: 'fabricBlue' },
    { kind: 'sofa', at: [16, 1.7], rotationY: 90, colour: 'fabricBlue' },
    { kind: 'table', at: [17.4, -4.1], rotationY: 0 },
    { kind: 'chair', at: [16.6, -4.1], rotationY: 90 },
    { kind: 'chair', at: [18.2, -4.1], rotationY: -90 },
    { kind: 'noticeBoard', at: [16, -5.37], rotationY: 0, label: 'BLOCK A NOTICES' },
    { kind: 'waterDispenser', at: [19.5, -5], rotationY: -90 },
    { kind: 'fan', at: [17, 0], rotationY: 0 },
  ],
  lights: [
    [-14, -3.4],
    [-14, 0],
    [-8, 0],
    [-2, 0],
    [4, 0],
    [10, 0],
    [10, 2.6],
    [17, -3],
    [17, 3],
  ],
  exits: [{ at: [-14, -2.55], radius: 1.7, promptLabel: 'Go downstairs to the court', entrance: 'hostel-a' }],
};

// ===========================================================================
// Porter's Lodge — one room by the main gate
// ===========================================================================

const PORTERS_LODGE: InteriorDef = {
  id: 'porters-lodge',
  name: "Porter's Lodge",
  bounds: [-3, -2.4, 3, 2.4],
  wallHeight: 2.8,
  rooms: [{ id: 'lodge', name: "Porter's Lodge", rect: [-3, -2.4, 3, 2.4], floor: 'floorTerrazzo', door: [3, 0] }],
  walls: [
    { from: [-3, -2.4], to: [3, -2.4], windows: [{ at: -0.4, width: 1.6 }] },
    { from: [-3, 2.4], to: [3, 2.4] },
    { from: [-3, -2.4], to: [-3, 2.4] },
    { from: [3, -2.4], to: [3, 2.4], openings: [{ at: 0, width: 1 }] },
  ],
  doors: [],
  props: [
    { kind: 'counter', at: [-1, 0], rotationY: 90 },
    { kind: 'chair', at: [-2.35, 0.9], rotationY: 90 },
    { kind: 'keyBoard', at: [-2.93, -1.3], rotationY: 90 },
    { kind: 'cabinet', at: [1.2, 2.12], rotationY: 180, label: 'LOST PROPERTY' },
    { kind: 'shelf', at: [-1.9, -2.2], rotationY: 0 },
    { kind: 'poster', at: [1.4, -2.33], rotationY: 0, colour: 'kenteGreen' },
    { kind: 'bucket', at: [2.55, -1.95], rotationY: 0, colour: 'plasticBlue' },
  ],
  lights: [[0, 0]],
  exits: [{ at: [2.45, 0], radius: 1.4, promptLabel: 'Go back outside', entrance: 'porters-lodge' }],
};

export const INTERIORS: Readonly<Record<InteriorId, InteriorDef>> = {
  'hostel-a-2f': HOSTEL_A_2F,
  'porters-lodge': PORTERS_LODGE,
};

// ===========================================================================
// Entrances: the doors between the campus and the interiors
// ===========================================================================

export type EntranceId = 'hostel-a' | 'porters-lodge';

export interface EntranceDef {
  readonly id: EntranceId;
  readonly interior: InteriorId;
  /** Where the door is on campus, in master-plan pixels, and how close to stand. */
  readonly outdoor: { readonly at: PlanPoint; readonly radius: number };
  readonly promptLabel: string;
  readonly eyebrow: string;
  /** Shown instead of going in while `requires` does not hold. */
  readonly lockedText: readonly string[];
  readonly requires?: Condition;
  /** The door is not offered at all until this holds. */
  readonly visibleWhen?: Condition;
  /** Where the player stands on coming back out (plan pixels, degrees). */
  readonly outdoorSpawn: { readonly at: PlanPoint; readonly yawDegrees: number };
  /** Where the player stands on arriving inside (local metres, degrees). */
  readonly indoorSpawn: { readonly at: Vec2Tuple; readonly yawDegrees: number };
}

export const ENTRANCES: readonly EntranceDef[] = [
  {
    // The stair tower in the Block A court. Interiors are one floor each, so
    // going in here is going up to the second floor, where A-214 is.
    id: 'hostel-a',
    interior: 'hostel-a-2f',
    outdoor: { at: [1312, 258], radius: 3.6 },
    promptLabel: 'Go up to the second floor',
    eyebrow: 'Hastech Hostels · Block A',
    lockedText: [
      'The stairs up to the student rooms.',
      "You can't move in yet: sign in at the gate, collect your student ID and find your roommate first.",
    ],
    requires: { flag: 'met_nii' },
    outdoorSpawn: { at: [1312, 266], yawDegrees: 180 },
    indoorSpawn: { at: [-13, 0.2], yawDegrees: -90 },
  },
  {
    id: 'porters-lodge',
    interior: 'porters-lodge',
    outdoor: { at: [951, 958], radius: 2.4 },
    promptLabel: "Go into the Porter's Lodge",
    eyebrow: 'Main gate',
    lockedText: [],
    // Before M01 is over Uncle Bright stands outside the door, and the two
    // prompts would compete for the same spot.
    visibleWhen: { flag: 'm01_complete' },
    outdoorSpawn: { at: [956, 958], yawDegrees: -90 },
    indoorSpawn: { at: [1.9, 0], yawDegrees: 90 },
  },
];

export function findEntrance(id: string): EntranceDef | undefined {
  return ENTRANCES.find((entrance) => entrance.id === id);
}

export function isInteriorId(value: unknown): value is InteriorId {
  return typeof value === 'string' && value in INTERIORS;
}

/**
 * A story point — a mission target or a character's post — in world metres.
 * With no `location` it is on campus, in master-plan pixels; inside an
 * interior it is already in that interior's local metres.
 */
export function locationPoint(location: InteriorId | undefined, at: readonly [number, number]): Vec2Tuple {
  return location ? [at[0], at[1]] : planPoint(at);
}

/** The room of an interior containing a point, if any. */
export function roomAt(interior: InteriorDef, x: number, z: number): InteriorRoomDef | undefined {
  // Later rooms win, so a room drawn over the corridor takes precedence.
  for (let index = interior.rooms.length - 1; index >= 0; index -= 1) {
    const room = interior.rooms[index];
    if (room && x >= room.rect[0] && x <= room.rect[2] && z >= room.rect[1] && z <= room.rect[3]) {
      return room;
    }
  }
  return undefined;
}
