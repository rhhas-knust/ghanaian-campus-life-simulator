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
        when: { flag: 'found_kojo_phone' },
        body: ['The tile sits back in place. Underneath, the hollow in the screed is empty now — just dust and a faint square where the bag lay.'],
      },
      {
        when: { flag: 'has_screwdriver' },
        title: 'Under the floor',
        body: [
          'You work the screwdriver into the gap and lever. The tile comes up with a dry crack.',
          'Underneath, in a hollow somebody chipped out of the screed: a bread bag, folded tight. Inside it, a small black phone — older than the one in the lost-property cabinet, with "K.B." scratched into the back.',
          'Its screen lights once when you touch it — 1% — and dies. The alarm that woke you was this. It has been waking up in the dark for two years.',
          '"If you ever find anything of mine — anything — don\'t take it to Admin. Keep it, and tell me."',
        ],
        bullets: ['Found: a hidden phone, flat. "K.B." scratched on the back'],
        effects: [{ type: 'flag', flag: 'found_kojo_phone' }],
      },
      {
        when: { flag: 'heard_buzz_again' },
        body: [
          'It rocks, and a thread of dust puffs out of the gap. Your fingernails will not get under it.',
          'You need something flat and strong. Nii fixes phones for a living — he will have tools.',
        ],
      },
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
        when: { flag: 'has_screwdriver' },
        body: [
          'Screwdrivers, three dead phones and a soldering iron resting on a tin lid. A price list in marker: "Screen ₵80. Charging port ₵30. Unlocking — ask."',
        ],
      },
      {
        when: { flag: 'heard_buzz_again' },
        title: 'A flat screwdriver',
        body: [
          'Among the tools: a long flat-head screwdriver, the handle wrapped in insulating tape. Exactly what the tile needs.',
          'Nii is not here to ask. You take it anyway.',
        ],
        bullets: ["Taken: Nii's flat screwdriver"],
        effects: [
          { type: 'flag', flag: 'has_screwdriver' },
          { type: 'flag', flag: 'took_nii_screwdriver' },
        ],
      },
      {
        body: [
          'Screwdrivers, three dead phones and a soldering iron resting on a tin lid. A price list in marker: "Screen ₵80. Charging port ₵30. Unlocking — ask."',
        ],
      },
    ],
  },
  {
    // Where the hidden phone gets charged (M03). Kojo's own charger from M02
    // fits; without it, Nii has a drawer of every charger ever made.
    id: 'desk-socket',
    location: 'hostel-a-2f',
    // The west end of the desk: the middle is too close to the loose tile, and
    // the two prompts competed for focus.
    at: [9.5, 4.7],
    radius: 1.1,
    promptLabel: 'Charge the phone at the desk',
    eyebrow: 'Room A-214',
    title: 'The desk socket',
    visibleWhen: { flag: 'found_kojo_phone' },
    action: { kind: 'inspect' },
    readings: [
      {
        when: { flag: 'kojo_phone_charging' },
        body: [
          'The old phone is charging. Locked with a PIN you do not know.',
          'The lock-screen photo: Kojo, younger, laughing, his arm round an older guy in a white shirt — sharp edge-up, a small gold stud in one ear.',
        ],
      },
      {
        when: { flag: 'found_charger' },
        title: 'It fits',
        body: [
          "None of your chargers fit the old port — but the one from the wardrobe does. KOJO, says the tape. Of course it fits.",
          'After a minute the screen wakes: a battery outline, then a lock screen. A PIN you do not know.',
          'The photo behind the clock: Kojo, younger, laughing, his arm round an older guy in a white shirt — sharp edge-up, a small gold stud in one ear.',
        ],
        bullets: ["Charging, with Kojo's own charger"],
        effects: [
          { type: 'flag', flag: 'kojo_phone_charging' },
          { type: 'flag', flag: 'saw_lockscreen_photo' },
        ],
      },
      {
        body: [
          'The socket works. Your charger does not fit this old phone — the port is a shape nobody has made for years.',
          'Nii keeps a drawer of every charger ever made. He is in the common room.',
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

/** The night that starts M03: the buzzing again, and this time a light. */
export const SECOND_BUZZ_CARD: StoryCard = {
  eyebrow: 'Night',
  title: 'Room A-214',
  body: [
    'Three in the morning. The buzzing again — the same spot, under the loose tile. Three short pulses, then silence.',
    'This time you are awake for it, and you see it: a thin green glow along the edge of the tile, and then dark.',
    'Nii sleeps through it. You lie there until the sky goes grey. Tomorrow that tile comes up. And tomorrow is your first lecture.',
  ],
  bullets: ['M03 First Lecture — started', 'Progress saved on this device'],
};

export const ORDINARY_NIGHT_CARD: StoryCard = {
  eyebrow: 'Night',
  title: 'Lights out',
  body: ['You sleep through the night. Somewhere a generator hums; under the floor, nothing stirs.'],
  bullets: ['Progress saved on this device'],
};

/**
 * Which card a night shows, checked top to bottom BEFORE the night's
 * `slept_day_<n>` flag is set. A night's effects mark it as told, so each
 * special night happens once.
 */
export const NIGHTS: readonly { readonly when?: Condition; readonly card: StoryCard; readonly effects?: readonly Effect[] }[] = [
  { when: { notFlag: 'slept_day_1' }, card: FIRST_NIGHT_CARD },
  {
    when: { flag: 'm02_complete', notFlag: 'heard_buzz_again' },
    card: SECOND_BUZZ_CARD,
    effects: [{ type: 'flag', flag: 'heard_buzz_again' }],
  },
  { card: ORDINARY_NIGHT_CARD },
];
