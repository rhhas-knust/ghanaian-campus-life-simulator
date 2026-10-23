/**
 * Everything the story remembers: who the player is, what has happened (flags),
 * how people feel about them, the campus clock and where they stood.
 *
 * Kept as one serialisable object so a save is just `toSave()` → JSON →
 * localStorage, and a load validates the JSON field by field. A save written by
 * an older or newer build that does not validate starts a fresh story rather
 * than crashing the game.
 */

import { isInteriorId, type LocationId } from '../config/interiors';
import { STORY_SETTINGS } from '../config/settings';
import { CAST } from './data/cast';
import {
  isAddressForm,
  isHomeId,
  isProgrammeId,
  isReputationAxis,
  type Condition,
  type Effect,
  type PlayerProfile,
  type ReputationAxis,
} from './types';

export const SAVE_VERSION = 1;

export interface SavedPosition {
  /**
   * Where the player is: the campus, or an interior. Saves written before
   * interiors existed have no `location`, and load as the campus — which is
   * where those players were.
   */
  readonly location: LocationId;
  /** Metres: campus world space, or the interior's local space. */
  readonly x: number;
  readonly z: number;
  readonly yawDegrees: number;
}

export interface SaveData {
  readonly version: number;
  readonly profile: PlayerProfile;
  readonly flags: readonly string[];
  readonly relationships: Readonly<Record<string, number>>;
  readonly reputation: Readonly<Record<ReputationAxis, number>>;
  readonly day: number;
  readonly minutes: number;
  readonly missionId: string | null;
  readonly position: SavedPosition | null;
}

const STARTING_REPUTATION: Record<ReputationAxis, number> = {
  integrity: 50,
  popularity: 10,
  academic: 50,
};

export class StoryState {
  private readonly flags = new Set<string>();
  private readonly relationships = new Map<string, number>();
  private readonly reputation: Record<ReputationAxis, number> = { ...STARTING_REPUTATION };
  private dayNumber = 1;
  private minutesOfDay: number = STORY_SETTINGS.dayOneStartMinutes;
  /** Fractional game minutes not yet added to the clock. */
  private pendingMinutes = 0;

  missionId: string | null;
  position: SavedPosition | null = null;

  constructor(
    readonly profile: PlayerProfile,
    missionId: string | null,
  ) {
    this.missionId = missionId;
    for (const member of CAST) {
      this.relationships.set(member.id, member.initialAttitude);
    }
  }

  // ------------------------------------------------------------------ flags

  hasFlag(flag: string): boolean {
    return this.flags.has(flag);
  }

  /** Returns true when the flag was not already set. */
  setFlag(flag: string): boolean {
    if (this.flags.has(flag)) {
      return false;
    }
    this.flags.add(flag);
    return true;
  }

  get flagList(): readonly string[] {
    return [...this.flags];
  }

  // ------------------------------------------------------- people and name

  relationship(id: string): number {
    return this.relationships.get(id) ?? 0;
  }

  reputationValue(axis: ReputationAxis): number {
    return this.reputation[axis];
  }

  meets(condition: Condition | undefined): boolean {
    if (!condition) {
      return true;
    }
    if (condition.flag !== undefined && !this.flags.has(condition.flag)) {
      return false;
    }
    if (condition.notFlag !== undefined && this.flags.has(condition.notFlag)) {
      return false;
    }
    if (condition.programme !== undefined && condition.programme !== this.profile.programme) {
      return false;
    }
    if (condition.atLeast !== undefined && this.relationship(condition.atLeast.who) < condition.atLeast.value) {
      return false;
    }
    return true;
  }

  apply(effect: Effect): void {
    switch (effect.type) {
      case 'flag':
        this.setFlag(effect.flag);
        break;
      case 'relationship':
        this.relationships.set(effect.who, clamp(this.relationship(effect.who) + effect.delta, -100, 100));
        break;
      case 'reputation':
        this.reputation[effect.axis] = clamp(this.reputation[effect.axis] + effect.delta, 0, 100);
        break;
    }
  }

  // ------------------------------------------------------------------ clock

  get day(): number {
    return this.dayNumber;
  }

  get minutes(): number {
    return this.minutesOfDay;
  }

  /** Advances the campus clock. The day does not roll over by itself: sleeping ends it. */
  advanceClock(seconds: number): void {
    this.pendingMinutes += seconds * STORY_SETTINGS.gameMinutesPerSecond;
    const whole = Math.floor(this.pendingMinutes);
    if (whole > 0) {
      this.pendingMinutes -= whole;
      // Stay up all night and the clock stops at 23:59 until the player sleeps.
      this.minutesOfDay = Math.min(this.minutesOfDay + whole, 24 * 60 - 1);
    }
  }

  sleep(): void {
    this.dayNumber += 1;
    this.minutesOfDay = STORY_SETTINGS.wakeMinutes;
    this.pendingMinutes = 0;
  }

  // ---------------------------------------------------------- persistence

  toSave(): SaveData {
    return {
      version: SAVE_VERSION,
      profile: this.profile,
      flags: this.flagList,
      relationships: Object.fromEntries(this.relationships),
      reputation: { ...this.reputation },
      day: this.dayNumber,
      minutes: this.minutesOfDay,
      missionId: this.missionId,
      position: this.position,
    };
  }

  /** Rebuilds a state from parsed JSON, or returns `null` if it does not validate. */
  static fromSave(raw: unknown): StoryState | null {
    if (!isRecord(raw) || raw.version !== SAVE_VERSION) {
      return null;
    }
    const profile = raw.profile;
    if (
      !isRecord(profile) ||
      typeof profile.name !== 'string' ||
      !isAddressForm(profile.address) ||
      !isProgrammeId(profile.programme) ||
      !isHomeId(profile.home)
    ) {
      return null;
    }
    const missionId = raw.missionId;
    if (missionId !== null && typeof missionId !== 'string') {
      return null;
    }

    const state = new StoryState(
      { name: profile.name, address: profile.address, programme: profile.programme, home: profile.home },
      missionId,
    );

    if (Array.isArray(raw.flags)) {
      for (const flag of raw.flags) {
        if (typeof flag === 'string') {
          state.flags.add(flag);
        }
      }
    }
    if (isRecord(raw.relationships)) {
      for (const [id, value] of Object.entries(raw.relationships)) {
        if (isFiniteNumber(value)) {
          state.relationships.set(id, clamp(value, -100, 100));
        }
      }
    }
    if (isRecord(raw.reputation)) {
      for (const [axis, value] of Object.entries(raw.reputation)) {
        if (isReputationAxis(axis) && isFiniteNumber(value)) {
          state.reputation[axis] = clamp(value, 0, 100);
        }
      }
    }
    if (isFiniteNumber(raw.day) && raw.day >= 1) {
      state.dayNumber = Math.floor(raw.day);
    }
    if (isFiniteNumber(raw.minutes)) {
      state.minutesOfDay = clamp(Math.floor(raw.minutes), 0, 24 * 60 - 1);
    }
    const position = raw.position;
    if (isRecord(position) && isFiniteNumber(position.x) && isFiniteNumber(position.z) && isFiniteNumber(position.yawDegrees)) {
      const location = position.location;
      if (location === undefined || location === 'campus') {
        state.position = { location: 'campus', x: position.x, z: position.z, yawDegrees: position.yawDegrees };
      } else if (isInteriorId(location)) {
        state.position = { location, x: position.x, z: position.z, yawDegrees: position.yawDegrees };
      }
      // An interior this build does not know (a save from a newer build):
      // leave the position unset, so the player starts at the gate rather
      // than inside a wall.
    }
    return state;
  }
}

/** `07:05`-style clock text. */
export function formatClock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
