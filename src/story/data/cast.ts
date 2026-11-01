/**
 * Who is on campus in the story build, where they stand, and what they say.
 *
 * `figure` describes how a character looks: which body, skin, hair and
 * clothes. The game dresses a rigged CC0 body in those colours, or the
 * procedural placeholder figure if the models did not load. Neither is the
 * final art in CHARACTER_BIBLE.md §4.
 *
 * `posts` are checked top to bottom and the first whose condition holds is
 * where the character is now; if none holds, they are not around. A post
 * without a `location` is on campus, in master-plan pixels; a post inside an
 * interior is in that interior's local metres (`src/config/interiors.ts`).
 *
 * `talks` work the same way: the first entry whose condition holds is the
 * conversation that starts. The dialogue itself lives in JSON under
 * `dialogue/`, never in TypeScript.
 */

import type { InteriorId } from '../../config/interiors';
import type { Condition } from '../types';

/** How a character looks. Colours are 0xRRGGBB. */
export interface FigureLook {
  /** Which rigged body to dress; `man` if omitted. */
  readonly body?: 'man' | 'woman';
  readonly skin: number;
  readonly hair: number;
  readonly top: number;
  readonly bottom: number;
  readonly shoes: number;
  /** Height in metres; the figure is scaled from a 1.75 m base. */
  readonly height: number;
}

export interface CastPost {
  readonly when?: Condition;
  readonly location?: InteriorId;
  readonly at: readonly [number, number];
  readonly yawDegrees: number;
}

export interface CastMember {
  readonly id: string;
  readonly name: string;
  /** Shown under the name in the dialogue box. */
  readonly role: string;
  /** Signature accent colour (CHARACTER_BIBLE.md §4), used for the portrait. */
  readonly accent: string;
  /** Starting relationship, −100…100 (CHARACTER_BIBLE.md "Initial attitude"). */
  readonly initialAttitude: number;
  readonly figure: FigureLook | null;
  readonly posts: readonly CastPost[];
  /** Where they stand in the arrival cinematic, if they are in it (campus, plan pixels). */
  readonly opening?: { readonly at: readonly [number, number]; readonly yawDegrees: number };
  readonly talks: readonly { readonly dialogue: string; readonly when?: Condition }[];
}

export const CAST: readonly CastMember[] = [
  {
    id: 'uncle-bright',
    name: 'Uncle Bright',
    role: 'Gate porter',
    accent: '#b89a5e',
    initialAttitude: 10,
    figure: { skin: 0x4a2f1f, hair: 0x9a9690, top: 0xa8916a, bottom: 0x3f3a30, shoes: 0x1e1a16, height: 1.72 },
    posts: [
      // Once day one is over he is back behind his counter.
      { when: { flag: 'm01_complete' }, location: 'porters-lodge', at: [-2, 0], yawDegrees: -90 },
      // Arrival day: outside the lodge door, facing the entrance path.
      { at: [957, 961], yawDegrees: -90 },
    ],
    opening: { at: [957, 961], yawDegrees: -90 },
    talks: [
      { dialogue: 'm01-uncle-bright', when: { notFlag: 'signed_in' } },
      { dialogue: 'm02-bright-drawer', when: { flag: 'knows_lost_property', notFlag: 'bright_opened_drawer' } },
      { dialogue: 'm02-bright-kojo', when: { flag: 'm02_met_kojo', notFlag: 'returned_kojo_phone' } },
      { dialogue: 'm02-bright-message', when: { flag: 'm01_complete', notFlag: 'm02_met_kojo' } },
      { dialogue: 'uncle-bright-idle' },
    ],
  },
  {
    id: 'registry-clerk',
    name: 'Mrs. Agyeman',
    role: 'Registry clerk',
    accent: '#7a5aa6',
    initialAttitude: 0,
    figure: { body: 'woman', skin: 0x5a3a26, hair: 0x1c1410, top: 0x7a5aa6, bottom: 0x2f2a3a, shoes: 0x1e1a16, height: 1.64 },
    // In the recess of the H, in front of the Administration entrance.
    posts: [{ at: [880, 268], yawDegrees: 180 }],
    opening: { at: [880, 268], yawDegrees: 180 },
    talks: [
      { dialogue: 'm01-registry-clerk', when: { notFlag: 'has_student_id' } },
      { dialogue: 'registry-clerk-idle' },
    ],
  },
  {
    id: 'nii',
    name: 'Nii Armah Tetteh',
    role: 'Roommate · CS Level 200',
    accent: '#e8792b',
    initialAttitude: 30,
    figure: { skin: 0x6b4430, hair: 0x15100c, top: 0xe8792b, bottom: 0x2c2f36, shoes: 0x2b2b2b, height: 1.78 },
    posts: [
      // From day two he holds court in the Block A common room.
      { when: { flag: 'm01_complete' }, location: 'hostel-a-2f', at: [18.4, 2.6], yawDegrees: 90 },
      // Arrival day: outside the Block A gateway, clear of the plaque to the east.
      { at: [1298, 338], yawDegrees: 180 },
    ],
    opening: { at: [1298, 338], yawDegrees: 180 },
    talks: [
      { dialogue: 'm01-nii', when: { flag: 'has_student_id', notFlag: 'met_nii' } },
      { dialogue: 'nii-early', when: { notFlag: 'met_nii' } },
      // M03 first: its conditions imply M02 is over, so M02's conversations
      // below can never shadow them.
      { dialogue: 'm03-nii-phone', when: { flag: 'found_kojo_phone', notFlag: 'kojo_phone_charging' } },
      { dialogue: 'm03-nii-screwdriver', when: { flag: 'heard_buzz_again', notFlag: 'has_screwdriver' } },
      // Returning the phone to Kojo also sets `phone_decision`, so this one
      // closes for good once the handset has gone back.
      { dialogue: 'm02-nii-handset', when: { flag: 'has_kojo_handset', notFlag: 'phone_decision' } },
      { dialogue: 'm02-nii-lost', when: { flag: 'm02_met_kojo', notFlag: 'knows_lost_property' } },
      { dialogue: 'nii-idle' },
    ],
  },
  {
    // Rusticated two years ago (CHARACTER_BIBLE.md). He cannot come through
    // the gate, so he waits on the road outside it — only during M02.
    id: 'kojo',
    name: 'Kojo Badu',
    role: 'Former A-214 resident',
    accent: '#4f7f86',
    initialAttitude: -20,
    figure: { skin: 0x553522, hair: 0x14100d, top: 0x4f7f86, bottom: 0x3b4a5c, shoes: 0xd8d2c4, height: 1.76 },
    posts: [{ when: { flag: 'read_bright_message', notFlag: 'returned_kojo_phone' }, at: [1046, 1030], yawDegrees: 35 }],
    talks: [
      { dialogue: 'm02-kojo-gate', when: { notFlag: 'm02_met_kojo' } },
      { dialogue: 'm02-kojo-return', when: { flag: 'has_kojo_handset' } },
      { dialogue: 'm02-kojo-waiting' },
    ],
  },
  // ------------------------------------------------------------------ M03
  {
    // Senior Lecturer and Faculty Examinations Officer (CHARACTER_BIBLE.md).
    // She takes UCIS 101, the course every first-year shares, so the first
    // lecture is hers whatever the player studies.
    id: 'sarpong',
    name: 'Dr. Afua Sarpong',
    role: 'Senior Lecturer · Engineering',
    accent: '#5d6b7a',
    initialAttitude: 0,
    figure: { body: 'woman', skin: 0x4e3221, hair: 0x1a1512, top: 0x5d6b7a, bottom: 0x2b2f36, shoes: 0x1a1a1a, height: 1.68 },
    posts: [{ when: { flag: 'm02_complete' }, location: 'lecture-hall-2', at: [-5.3, -0.4], yawDegrees: -90 }],
    talks: [
      { dialogue: 'm03-sarpong-lecture', when: { flag: 'read_timetable', notFlag: 'attended_lecture' } },
      { dialogue: 'sarpong-early', when: { notFlag: 'attended_lecture' } },
      { dialogue: 'sarpong-idle' },
    ],
  },
  {
    id: 'abiba',
    name: 'Abiba Fuseini',
    role: 'Electrical Engineering · Level 200',
    accent: '#3b3f8f',
    initialAttitude: 0,
    // Indigo headscarf (the hair role), plain polo, dark trousers.
    figure: { body: 'woman', skin: 0x3f2819, hair: 0x3b3f8f, top: 0xd9d4c4, bottom: 0x23262e, shoes: 0x3a3a3a, height: 1.74 },
    // At the foot of the Library steps after the lecture, as Dr. Sarpong said,
    // facing the road the player comes from. Any closer to the door and the
    // verandah columns hide her.
    posts: [{ when: { flag: 'attended_lecture' }, at: [518, 570], yawDegrees: -90 }],
    talks: [
      { dialogue: 'm03-abiba', when: { notFlag: 'met_abiba' } },
      { dialogue: 'abiba-idle' },
    ],
  },
  {
    id: 'kb',
    name: 'Kwabena "KB" Asante-Boakye',
    role: 'Business Administration · Level 400',
    accent: '#d8b45a',
    initialAttitude: 15,
    // White fitted shirt, gold trim, clean white sneakers.
    figure: { skin: 0x5a3a26, hair: 0x120d0a, top: 0xf2f0ea, bottom: 0x2a2d33, shoes: 0xf4f4f0, height: 1.83 },
    // Hosting on the Student Centre steps, facing the courtyard.
    posts: [{ when: { flag: 'met_abiba' }, at: [1232, 570], yawDegrees: 90 }],
    talks: [
      { dialogue: 'm03-kb', when: { notFlag: 'met_kb' } },
      { dialogue: 'kb-idle' },
    ],
  },
  {
    id: 'selasi',
    name: 'Selasi Kumah',
    role: 'Economics · Level 300',
    accent: '#1f8a5b',
    initialAttitude: 5,
    // Emerald print top under a dark blazer.
    figure: { body: 'woman', skin: 0x4a2f1f, hair: 0x15100c, top: 0x1f8a5b, bottom: 0x2d2a33, shoes: 0x1e1a16, height: 1.66 },
    // Just outside the party, with a clipboard, where everyone leaving passes.
    posts: [{ when: { flag: 'met_abiba' }, at: [1226, 606], yawDegrees: 70 }],
    talks: [
      { dialogue: 'm03-selasi', when: { flag: 'met_kb', notFlag: 'met_selasi' } },
      { dialogue: 'selasi-early', when: { notFlag: 'met_selasi' } },
      { dialogue: 'selasi-idle' },
    ],
  },
  // Classmates: background only, so they have no conversations (and therefore
  // no "Talk to" prompt). Before the lecture they wait at the front of Room
  // 104, clear of the benches; afterwards they are at KB's party, so it is a
  // party and not one man on some steps.
  ...(
    [
      ['classmate-kwesi', 'Kwesi', 0x5a3a26, 0x1d4f8a, 'man', [-3.7, -3.1], -60, [1212, 556], 120],
      ['classmate-efua', 'Efua', 0x4a2f1f, 0xb5473a, 'woman', [-3.7, 2.4], -120, [1205, 567], -60],
      ['classmate-delali', 'Delali', 0x6b4430, 0x3e7a4a, 'man', [-3.2, 3.4], -100, [1210, 624], 90],
    ] as const
  ).map(
    ([id, name, skin, top, body, at, yawDegrees, partyAt, partyYaw]): CastMember => ({
      id,
      name,
      role: 'Classmate',
      accent: '#5b6168',
      initialAttitude: 0,
      figure: { body, skin, hair: 0x15100c, top, bottom: 0x2c2f36, shoes: 0x2b2b2b, height: body === 'woman' ? 1.65 : 1.76 },
      posts: [
        { when: { flag: 'met_abiba', notFlag: 'm03_complete' }, at: partyAt, yawDegrees: partyYaw },
        { when: { flag: 'm02_complete', notFlag: 'attended_lecture' }, location: 'lecture-hall-2', at, yawDegrees },
      ],
      talks: [],
    }),
  ),
  {
    // The "shadow beat" of the arrival cinematic (STORYLINE.md M00, shot 6).
    id: 'narh',
    name: 'Mr. Julius Narh',
    role: 'Deputy Registrar',
    accent: '#2f3a4a',
    initialAttitude: 0,
    figure: { skin: 0x3e281b, hair: 0x2a2622, top: 0x2f3a4a, bottom: 0x2f3a4a, shoes: 0x111111, height: 1.8 },
    posts: [],
    // On the Administration lawn, looking west over the hedge at the field.
    opening: { at: [785, 292], yawDegrees: 90 },
    talks: [],
  },
];

export function findCastMember(id: string): CastMember | undefined {
  return CAST.find((member) => member.id === id);
}
