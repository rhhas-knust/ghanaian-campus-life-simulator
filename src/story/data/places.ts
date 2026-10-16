/**
 * Story places that are not people: things the player uses rather than reads.
 * Master-plan pixels, like the rest of the layout.
 */

import type { PlanPoint } from '../../config/campusLayout';

export interface StoryPlaceDef {
  readonly id: string;
  readonly at: PlanPoint;
  readonly radius: number;
  readonly promptLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  /** Shown when the action is not available yet. */
  readonly lockedText: readonly string[];
  readonly action: 'sleep';
}

export const STORY_PLACES: readonly StoryPlaceDef[] = [
  {
    // Interiors are a later stage, so the room is reached through the stair
    // tower in the Block A court and the night happens on a story card.
    id: 'room-a214',
    at: [1312, 258],
    radius: 3.6,
    promptLabel: 'Go up to room A-214',
    eyebrow: 'Hastech Hostels · Block A',
    title: 'Stairs to room A-214',
    lockedText: [
      'The stairs up to the student rooms.',
      "You can't move in yet: sign in at the gate, collect your student ID and find your roommate first.",
    ],
    action: 'sleep',
  },
];

/** Where the player wakes up: just outside the Block A gateway, facing the north road. */
export const WAKE_SPOT = { at: [1312, 352] as PlanPoint, yawDegrees: 180 };

/** A story card: shown in the reading panel, like a sign. */
export interface StoryCard {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
}

/** The end of M01 (STORYLINE.md §2): day one ends, and something buzzes under the floor. */
export const FIRST_NIGHT_CARD: StoryCard = {
  eyebrow: 'Day 1 · Night',
  title: 'Room A-214',
  body: [
    'The room smells of fresh paint and old floor polish. Nii is asleep before you have finished unpacking.',
    'Then, in the dark, something buzzes. Under the floor, near your bed. Once. Twice. Then nothing.',
    'Mission 2, "First Lecture", is still being built. Until then, the whole campus is yours to explore.',
  ],
  bullets: ['M01 Akwaaba — complete', 'Progress saved on this device'],
};

export const ORDINARY_NIGHT_CARD: StoryCard = {
  eyebrow: 'Night',
  title: 'Lights out',
  body: ['You sleep through the night. Somewhere a generator hums; somewhere a phone stays silent.'],
  bullets: ['Progress saved on this device'],
};
