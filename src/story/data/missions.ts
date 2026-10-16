/**
 * Main missions, as data.
 *
 * A step is done when its flag is set — by a conversation, by reading a sign
 * (`seen:<interactable id>`), by opening the phone, or by sleeping. The current
 * step is therefore worked out from the flags rather than stored, so a save can
 * never point at a step the flags disagree with, and doing something early
 * (reading the sign before signing in) still counts later.
 *
 * Steps follow STORYLINE.md §2. `target` puts the marker on the minimap and the
 * beacon over the world, in master-plan pixels.
 */

import type { PlanPoint } from '../../config/campusLayout';

export interface MissionStepDef {
  readonly objective: string;
  readonly doneWhen: string;
  readonly target: PlanPoint | null;
}

export interface MissionDef {
  readonly id: string;
  /** Short code shown in the phone, e.g. `M01`. */
  readonly code: string;
  readonly title: string;
  readonly steps: readonly MissionStepDef[];
  /** Mission that starts when this one ends; `null` = free roam until it is built. */
  readonly next: string | null;
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
        target: [957, 961],
      },
      {
        objective: 'Read the AKWAABA campus sign',
        doneWhen: 'seen:sign:campus-welcome-sign',
        target: [1092, 978],
      },
      {
        // Before the Administration Block rather than after it (as first drafted
        // in STORYLINE.md): the signpost is on the way north, so the route never
        // doubles back across the courtyard.
        objective: 'Cross to the courtyard signpost and check the way',
        doneWhen: 'seen:sign:courtyard-finger-post',
        target: [1052, 742],
      },
      {
        objective: 'Collect your student ID at the Administration Block',
        doneWhen: 'has_student_id',
        target: [880, 268],
      },
      {
        objective: 'Find your roommate at Hastech Hostels, Block A',
        doneWhen: 'met_nii',
        target: [1298, 338],
      },
      {
        objective: 'Open your phone and read the Block A group chat',
        doneWhen: 'read_group_chat',
        target: null,
      },
      {
        objective: 'Go up to room A-214 and get some sleep',
        doneWhen: 'slept_day_1',
        target: [1312, 258],
      },
    ],
    next: null,
  },
];

export const FIRST_MISSION_ID = 'm01';

export function findMission(id: string | null): MissionDef | undefined {
  return id === null ? undefined : MISSIONS.find((mission) => mission.id === id);
}
