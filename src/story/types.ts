/**
 * Story vocabulary shared by the state, the dialogue runner, the mission
 * director and the UI.
 *
 * Nothing here imports Three.js or touches the DOM: the story layer is plain
 * data and logic, so it can be tested, saved and reasoned about on its own.
 */

export const PROGRAMMES = {
  engineering: 'Engineering',
  'computer-science': 'Computer Science',
  business: 'Business Administration',
  communication: 'Communication Studies',
  architecture: 'Architecture',
} as const;
export type ProgrammeId = keyof typeof PROGRAMMES;

/** One line each for character creation, from GAME_DESIGN.md §4. */
export const PROGRAMME_BLURBS: Record<ProgrammeId, string> = {
  engineering: 'Faculty of Engineering. Labs, workshops and the exams office.',
  'computer-science': 'Lecture Hall 2. You can follow a file to whoever uploaded it.',
  business: 'Lecture Hall 1. You read a money trail more easily than most.',
  communication: 'Lecture Hall 3. Close to the campus paper, The UCIS Echo.',
  architecture: 'Lecture Hall 3 design studios. Site plans make sense to you.',
};

/**
 * Akan day names, Sunday first: [male, female]. Character creation offers the
 * one for the day the player starts, as GAME_DESIGN.md §4 suggests.
 */
export const AKAN_DAY_NAMES: readonly (readonly [string, string])[] = [
  ['Kwasi', 'Akosua'],
  ['Kwadwo', 'Adwoa'],
  ['Kwabena', 'Abena'],
  ['Kwaku', 'Akua'],
  ['Yaw', 'Yaa'],
  ['Kofi', 'Afua'],
  ['Kwame', 'Ama'],
];

export const HOMES = {
  coastal: 'Coastal city',
  northern: 'Northern town',
  volta: 'Volta',
  ashanti: 'Ashanti',
  abroad: 'Raised abroad',
} as const;
export type HomeId = keyof typeof HOMES;

/** How dialogue addresses the player. Cosmetic options wait for the rigged character (stage D). */
export type AddressForm = 'he' | 'she' | 'they';

export const ADDRESS_LABELS: Record<AddressForm, string> = {
  he: 'He / him',
  she: 'She / her',
  they: 'They / them',
};

export interface PlayerProfile {
  readonly name: string;
  readonly address: AddressForm;
  readonly programme: ProgrammeId;
  readonly home: HomeId;
}

/** The three campus-wide reputation axes, each 0–100 (GAME_DESIGN.md §8). */
export type ReputationAxis = 'integrity' | 'popularity' | 'academic';

export const REPUTATION_LABELS: Record<ReputationAxis, string> = {
  integrity: 'Integrity',
  popularity: 'Popularity',
  academic: 'Academic standing',
};

/** A condition in data: every field present must hold. */
export interface Condition {
  readonly flag?: string;
  readonly notFlag?: string;
  readonly programme?: ProgrammeId;
}

/** Something a dialogue line or choice does to the story state. */
export type Effect =
  | { readonly type: 'flag'; readonly flag: string }
  | { readonly type: 'relationship'; readonly who: string; readonly delta: number }
  | { readonly type: 'reputation'; readonly axis: ReputationAxis; readonly delta: number };

export function isProgrammeId(value: unknown): value is ProgrammeId {
  return typeof value === 'string' && value in PROGRAMMES;
}

export function isHomeId(value: unknown): value is HomeId {
  return typeof value === 'string' && value in HOMES;
}

export function isAddressForm(value: unknown): value is AddressForm {
  return value === 'he' || value === 'she' || value === 'they';
}

export function isReputationAxis(value: unknown): value is ReputationAxis {
  return value === 'integrity' || value === 'popularity' || value === 'academic';
}
