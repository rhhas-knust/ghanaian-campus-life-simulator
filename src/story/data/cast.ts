/**
 * Who is on campus in the story build, where they stand, and what they say.
 *
 * Placeholder figures only: the real characters need the rigged models in
 * CHARACTER_BIBLE.md §4 (roadmap stage D). Positions are master-plan pixels,
 * like everything else in the layout. A `post` of `null` means the character
 * is heard (on the phone) but not seen.
 *
 * `talks` is checked top to bottom; the first entry whose condition holds is
 * the conversation that starts. The dialogue itself lives in JSON under
 * `dialogue/`, never in TypeScript.
 */

import type { PlanPoint } from '../../config/campusLayout';
import type { Condition } from '../types';

/** Colours for the placeholder figure, as 0xRRGGBB. */
export interface FigureLook {
  readonly skin: number;
  readonly hair: number;
  readonly top: number;
  readonly bottom: number;
  readonly shoes: number;
  /** Height in metres; the figure is scaled from a 1.75 m base. */
  readonly height: number;
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
  readonly post: { readonly at: PlanPoint; readonly yawDegrees: number } | null;
  /** `opening` figures only appear in the arrival cinematic. */
  readonly appears: 'always' | 'opening';
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
    // Beside the Porter's Lodge door, facing the entrance path.
    post: { at: [957, 961], yawDegrees: -90 },
    appears: 'always',
    talks: [
      { dialogue: 'm01-uncle-bright', when: { notFlag: 'signed_in' } },
      { dialogue: 'uncle-bright-idle' },
    ],
  },
  {
    id: 'registry-clerk',
    name: 'Mrs. Agyeman',
    role: 'Registry clerk',
    accent: '#7a5aa6',
    initialAttitude: 0,
    figure: { skin: 0x5a3a26, hair: 0x1c1410, top: 0x7a5aa6, bottom: 0x2f2a3a, shoes: 0x1e1a16, height: 1.64 },
    // In the recess of the H, in front of the Administration entrance.
    post: { at: [880, 268], yawDegrees: 180 },
    appears: 'always',
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
    // Outside the Block A gateway, clear of the building plaque to the east.
    post: { at: [1298, 338], yawDegrees: 180 },
    appears: 'always',
    talks: [
      { dialogue: 'm01-nii', when: { flag: 'has_student_id', notFlag: 'met_nii' } },
      { dialogue: 'nii-early', when: { notFlag: 'met_nii' } },
      { dialogue: 'nii-idle' },
    ],
  },
  {
    // The "shadow beat" of the arrival cinematic (STORYLINE.md M00, shot 4).
    id: 'narh',
    name: 'Mr. Julius Narh',
    role: 'Deputy Registrar',
    accent: '#2f3a4a',
    initialAttitude: 0,
    figure: { skin: 0x3e281b, hair: 0x2a2622, top: 0x2f3a4a, bottom: 0x2f3a4a, shoes: 0x111111, height: 1.8 },
    // On the Administration lawn, looking west over the hedge at the field.
    post: { at: [785, 292], yawDegrees: 90 },
    appears: 'opening',
    talks: [],
  },
];

export function findCastMember(id: string): CastMember | undefined {
  return CAST.find((member) => member.id === id);
}
