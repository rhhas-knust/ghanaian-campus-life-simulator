/**
 * Story places: things the player uses or inspects rather than reads off a
 * sign — the bed in A-214, the wardrobe, the lost-property cabinet.
 *
 * Positions follow the cast convention: no `location` means campus, in
 * master-plan pixels; inside an interior they are local metres.
 *
 * An `inspect` place shows the first reading whose condition holds, and
 * applies its effects — that is how searching the wardrobe sets
 * `found_charger`. Readings should only ever SET flags: the player can inspect
 * a place as often as they like, so a relationship change here would repeat.
 */

import type { InteriorId } from '../../config/interiors';
import type { Condition, Effect } from '../types';

export interface PlaceReading {
  readonly when?: Condition;
  readonly title?: string;
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
  readonly effects?: readonly Effect[];
}

export interface StoryPlaceDef {
  readonly id: string;
  readonly location?: InteriorId;
  readonly at: readonly [number, number];
  readonly radius: number;
  readonly promptLabel: string;
  readonly eyebrow: string;
  readonly title: string;
  /** The place is not offered at all until this holds. */
  readonly visibleWhen?: Condition;
  /** `sleep` ends the day if `requires` holds; otherwise it shows the readings. */
  readonly action: { readonly kind: 'inspect' } | { readonly kind: 'sleep'; readonly requires: Condition };
  readonly readings: readonly PlaceReading[];
}

export const STORY_PLACES: readonly StoryPlaceDef[] = [
  // ------------------------------------------------------------ Room A-214
  {
    id: 'bed-a214',
    location: 'hostel-a-2f',
    at: [11.2, 4.9],
    radius: 1.5,
    promptLabel: 'Sleep',
    eyebrow: 'Room A-214',
    title: 'Your bed',
    action: { kind: 'sleep', requires: { flag: 'met_nii' } },
    readings: [{ body: ['A thin mattress on a metal frame. It will do.'] }],
  },
  {
    id: 'wardrobe-a214',
    location: 'hostel-a-2f',
    at: [11.45, 2.15],
    radius: 1.3,
    promptLabel: 'Look in the wardrobe',
    eyebrow: 'Room A-214',
    title: 'The wardrobe',
    action: { kind: 'inspect' },
    readings: [
      {
        when: { flag: 'found_charger' },
        body: [
          'Your clothes, on the rail. The Black Stars sticker is still inside the door — the same as the one Kojo described on his phone.',
        ],
      },
      {
        when: { flag: 'm02_met_kojo' },
        title: 'Something at the back',
        body: [
          'You look properly this time, shelf by shelf.',
          'Behind the lining paper at the back of the top shelf: a phone charger, the plug wrapped in tape. On the tape, in marker capitals: KOJO.',
          'So he really did live here. The charger, though — no phone.',
        ],
        bullets: ["Found: Kojo's old charger"],
        effects: [{ type: 'flag', flag: 'found_charger' }],
      },
      {
        body: [
          'Two shelves, a rail and a smell of mothballs. Somebody stuck a Black Stars sticker inside the door and never took it off.',
        ],
      },
    ],
  },
  {
    id: 'loose-tile',
    location: 'hostel-a-2f',
    at: [10.55, 4.25],
    radius: 1.1,
    promptLabel: 'Look at the loose tile',
    eyebrow: 'Room A-214',
    title: 'The loose tile',
    action: { kind: 'inspect' },
    readings: [
      {
        when: { flag: 'noticed_loose_tile' },
        body: ['Still loose. Still silent.'],
      },
      {
        when: { flag: 'slept_day_1' },
        body: [
          'The tile beside your bed rocks under your foot. It will not lift — not with your fingers, anyway.',
          "Last night's buzzing seemed to come from about here. Now: nothing at all.",
        ],
        effects: [{ type: 'flag', flag: 'noticed_loose_tile' }],
      },
      {
        body: ['One floor tile beside the bed rocks when you step on it. Nii warned you about this one.'],
      },
    ],
  },
  {
    id: 'nii-table',
    location: 'hostel-a-2f',
    at: [8.85, 2.75],
    radius: 1.2,
    promptLabel: "Look at Nii's table",
    eyebrow: 'Room A-214',
    title: "Nii's repair table",
    action: { kind: 'inspect' },
    readings: [
      {
        body: [
          'Screwdrivers, three dead phones and a soldering iron resting on a tin lid. A price list in marker: "Screen ₵80. Charging port ₵30. Unlocking — ask."',
        ],
      },
    ],
  },
  // ------------------------------------------------------- the common room
  {
    id: 'notice-common',
    location: 'hostel-a-2f',
    at: [16, -4.6],
    radius: 1.7,
    promptLabel: 'Read the notice board',
    eyebrow: 'Block A · Common room',
    title: 'Block A notices',
    action: { kind: 'inspect' },
    readings: [
      {
        when: { flag: 'm02_met_kojo', notFlag: 'knows_lost_property' },
        body: [
          'WATER: 5 a.m. to 7 a.m. Fill your buckets.',
          'ROOM INSPECTION: Friday. The caretaker will check for illegal cookers.',
          'LOST & FOUND: anything found during room clearances goes to the Porter\'s Lodge. Ask Uncle Bright.',
        ],
        bullets: ['Lost property ends up at the Porter\'s Lodge'],
        effects: [{ type: 'flag', flag: 'knows_lost_property' }],
      },
      {
        body: [
          'WATER: 5 a.m. to 7 a.m. Fill your buckets.',
          'ROOM INSPECTION: Friday. The caretaker will check for illegal cookers.',
          "LOST & FOUND: anything found during room clearances goes to the Porter's Lodge. Ask Uncle Bright.",
          'FOR SALE: one electric kettle, barely illegal. See A-207.',
        ],
      },
    ],
  },
  // -------------------------------------------------------- Porter's Lodge
  {
    id: 'sign-in-book',
    location: 'porters-lodge',
    at: [-0.55, 1.05],
    radius: 1.3,
    promptLabel: 'Read the sign-in book',
    eyebrow: "Porter's Lodge",
    title: 'The sign-in book',
    action: { kind: 'inspect' },
    readings: [
      {
        body: [
          "Today's page is half full. Further back, your own name, in your own nervous handwriting, from arrival day.",
          'Much further back — two years back — one page has been torn out, close to the spine.',
        ],
        effects: [{ type: 'flag', flag: 'noticed_torn_page' }],
      },
    ],
  },
  {
    id: 'lost-property',
    location: 'porters-lodge',
    at: [1.2, 1.5],
    radius: 1.4,
    promptLabel: 'Check the lost-property cabinet',
    eyebrow: "Porter's Lodge",
    title: 'Lost property',
    action: { kind: 'inspect' },
    readings: [
      {
        when: { flag: 'has_kojo_handset' },
        body: ['Umbrellas, a single sandal, a tray of ID cards with the names worn off. Nothing else of Kojo\'s.'],
      },
      {
        when: { flag: 'bright_opened_drawer' },
        title: "Kojo's phone",
        body: [
          'Umbrellas, a single sandal, a tray of ID cards with the names worn off.',
          'At the back of the bottom drawer: a black Tecno, cracked in one corner, a Black Stars sticker on the back. A paper tag is tied to it.',
          '"A-214. Room clearance. Received from: Registry, Administration Block. UNCLAIMED."',
        ],
        bullets: ["Taken: Kojo's phone. It's dead — no charge at all."],
        effects: [{ type: 'flag', flag: 'has_kojo_handset' }],
      },
      {
        body: ['A grey metal cabinet, LOST PROPERTY stencilled on the front. Locked. Uncle Bright keeps the key on his belt.'],
      },
    ],
  },
];

/** A story card: shown in the reading panel, like a sign. */
export interface StoryCard {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: readonly string[];
  readonly bullets?: readonly string[];
}

/** Where the player wakes: on their feet beside the bed in A-214, facing the door. */
export const WAKE_SPOT = { location: 'hostel-a-2f' as const, at: [10.2, 3.3] as const, yawDegrees: 0 };

/** The end of M01 (STORYLINE.md §2): day one ends, and something buzzes under the floor. */
export const FIRST_NIGHT_CARD: StoryCard = {
  eyebrow: 'Day 1 · Night',
  title: 'Room A-214',
  body: [
    'The room smells of fresh paint and old floor polish. Nii is asleep before you have finished unpacking.',
    'Then, in the dark, something buzzes. Under the floor, near your bed. Once. Twice. Then nothing.',
    'Morning comes too early. Your phone has a new message.',
  ],
  bullets: ['M01 Akwaaba — complete', 'Progress saved on this device'],
};

export const ORDINARY_NIGHT_CARD: StoryCard = {
  eyebrow: 'Night',
  title: 'Lights out',
  body: ['You sleep through the night. Somewhere a generator hums; under the floor, nothing stirs.'],
  bullets: ['Progress saved on this device'],
};
