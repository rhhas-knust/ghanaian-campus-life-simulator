/**
 * Main missions, as data.
 *
 * A step is done when its flag is set — by a conversation, by reading a sign
 * (`seen:<interactable id>`), by inspecting a story place, by opening the
 * phone, or by sleeping. The current step is worked out from the flags rather
 * than stored, so a save can never point at a step the flags disagree with,
 * and doing something early (reading the sign before signing in) still counts.
 * To stop steps completing out of order, the conversations and places that set
 * a step's flag are themselves gated on the previous step's flag.
 *
 * `target` puts the marker on the minimap and the beacon in the world. With no
 * `location` it is on campus, in master-plan pixels; inside an interior it is
 * in that interior's local metres. When the target is inside a building and
 * the player is not, the marker points at the building's door instead.
 *
 * Steps follow STORYLINE.md §2 and §8.
 */

import type { InteriorId } from '../../config/interiors';

export interface MissionTarget {
  readonly location?: InteriorId;
  readonly at: readonly [number, number];
}

export interface MissionStepDef {
  readonly objective: string;
  readonly doneWhen: string;
  readonly target: MissionTarget | null;
}

export interface MissionDef {
  readonly id: string;
  /** Short code shown in the phone, e.g. `M01`. */
  readonly code: string;
  readonly title: string;
  readonly steps: readonly MissionStepDef[];
  /** Mission that starts when this one ends; `null` = free roam until it is built. */
  readonly next: string | null;
  /**
   * Shown when the last step is done. The game appends each listed
   * character's standing, so the player sees what their choices did. Omitted
   * when another card already marks the end (M01 ends on the night card).
   */
  readonly completion?: {
    readonly title: string;
    readonly body: readonly string[];
    readonly people: readonly string[];
    readonly next: string;
  };
}

export const MISSIONS: readonly MissionDef[] = [
  {
    id: 'm01',
    code: 'M01',
    title: 'Akwaaba',
    steps: [
      {
        objective: "Walk through the gate and sign in with Uncle Bright at the Porter's Lodge",
        doneWhen: 'signed_in',
        target: { at: [957, 961] },
      },
      {
        objective: 'Read the AKWAABA campus sign',
        doneWhen: 'seen:sign:campus-welcome-sign',
        target: { at: [1092, 978] },
      },
      {
        // Before the Administration Block rather than after it (as first drafted
        // in STORYLINE.md): the signpost is on the way north, so the route never
        // doubles back across the courtyard.
        objective: 'Cross to the courtyard signpost and check the way',
        doneWhen: 'seen:sign:courtyard-finger-post',
        target: { at: [1052, 742] },
      },
      {
        objective: 'Collect your student ID at the Administration Block',
        doneWhen: 'has_student_id',
        target: { at: [880, 268] },
      },
      {
        objective: 'Find your roommate at Hastech Hostels, Block A',
        doneWhen: 'met_nii',
        target: { at: [1298, 338] },
      },
      {
        objective: 'Open your phone and read the Block A group chat',
        doneWhen: 'read_group_chat',
        target: null,
      },
      {
        objective: 'Go up to room A-214 and get some sleep',
        doneWhen: 'slept_day_1',
        target: { location: 'hostel-a-2f', at: [11.2, 4.9] },
      },
    ],
    next: 'm02',
  },
  {
    // "Kojo's Missing Phone" — STORYLINE.md §2, M02.
    id: 'm02',
    code: 'M02',
    title: "Kojo's Missing Phone",
    steps: [
      {
        objective: "Read the message from the Porter's Lodge",
        doneWhen: 'read_bright_message',
        target: null,
      },
      {
        objective: 'Meet the visitor waiting outside the main gate',
        doneWhen: 'm02_met_kojo',
        target: { at: [1046, 1030] },
      },
      {
        objective: "Search room A-214 for any sign of Kojo's phone",
        doneWhen: 'found_charger',
        target: { location: 'hostel-a-2f', at: [11.45, 2.15] },
      },
      {
        objective: 'Find out where lost things end up — try Nii in the Block A common room',
        doneWhen: 'knows_lost_property',
        target: { location: 'hostel-a-2f', at: [18.4, 2.6] },
      },
      {
        objective: "Ask Uncle Bright about lost property at the Porter's Lodge",
        doneWhen: 'bright_opened_drawer',
        target: { location: 'porters-lodge', at: [-2, 0] },
      },
      {
        objective: 'Check the lost-property cabinet',
        doneWhen: 'has_kojo_handset',
        target: { location: 'porters-lodge', at: [1.2, 1.5] },
      },
      {
        objective: 'Take the phone to Kojo at the main gate',
        doneWhen: 'returned_kojo_phone',
        target: { at: [1046, 1030] },
      },
    ],
    next: 'm03',
    completion: {
      title: "Kojo's Missing Phone",
      body: [
        'The phone is back with its owner. Whatever else Kojo left in A-214, he did not say.',
        "The tag said Registry, Administration Block. Somebody there had it for two years and never called him.",
      ],
      people: ['kojo', 'uncle-bright', 'nii'],
      next: 'Next: M03 First Lecture. Get some sleep in A-214 tonight — the floor has more to say.',
    },
  },
  {
    // "First Lecture" — STORYLINE.md §8, M03. Day 3: the phone under the
    // floor, the first lecture, and three people who will matter later.
    id: 'm03',
    code: 'M03',
    title: 'First Lecture',
    steps: [
      {
        objective: 'Get some sleep in A-214',
        doneWhen: 'heard_buzz_again',
        target: { location: 'hostel-a-2f', at: [11.2, 4.9] },
      },
      {
        objective: 'Find something to lift the loose tile — Nii fixes phones, so he has tools',
        doneWhen: 'has_screwdriver',
        target: { location: 'hostel-a-2f', at: [18.4, 2.6] },
      },
      {
        objective: 'Lift the loose tile beside your bed',
        doneWhen: 'found_kojo_phone',
        target: { location: 'hostel-a-2f', at: [10.55, 4.25] },
      },
      {
        objective: 'Get the old phone charging',
        doneWhen: 'kojo_phone_charging',
        target: { location: 'hostel-a-2f', at: [9.5, 4.7] },
      },
      {
        objective: 'Check your phone for your timetable',
        doneWhen: 'read_timetable',
        target: null,
      },
      {
        objective: 'Get to your first lecture: UCIS 101, Lecture Hall 2, Room 104',
        doneWhen: 'attended_lecture',
        target: { location: 'lecture-hall-2', at: [-5.3, -0.4] },
      },
      {
        objective: 'Find Abiba Fuseini on the Library steps',
        doneWhen: 'met_abiba',
        target: { at: [518, 570] },
      },
      {
        objective: "Go to KB's welcome party at the Student Centre",
        doneWhen: 'met_kb',
        target: { at: [1232, 570] },
      },
      {
        objective: 'Talk to Selasi, who is handing out flyers outside the party',
        doneWhen: 'met_selasi',
        target: { at: [1226, 606] },
      },
    ],
    next: null,
    completion: {
      title: 'First Lecture',
      body: [
        'Day three: a phone under the floor, a lecture about honesty, and three people who each wanted something from you.',
        'The old phone is charging in A-214. Its lock screen keeps showing Kojo with his arm round a man with a gold stud in one ear.',
      ],
      people: ['abiba', 'kb', 'selasi', 'sarpong', 'nii'],
      next: 'Free roam. Mission 4 is still being written — explore, or sleep in A-214 to end the day.',
    },
  },
];

export const FIRST_MISSION_ID = 'm01';

export function findMission(id: string | null): MissionDef | undefined {
  return id === null ? undefined : MISSIONS.find((mission) => mission.id === id);
}
