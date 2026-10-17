/**
 * Works out what the player should be doing now, from the story state.
 *
 * Deliberately small: it reads flags and reports the current objective. It
 * does not know about the HUD, the camera or the world — the game asks it what
 * the objective is and tells the UI.
 */

import { planPoint } from '../config/campusLayout';
import type { Vec2Tuple } from '../types';
import { findMission, type MissionDef } from './data/missions';
import type { StoryState } from './StoryState';

export interface Objective {
  /** `M01 · Akwaaba`, or `Free roam`. */
  readonly heading: string;
  readonly text: string;
  /** World metres, or `null` when there is nowhere in particular to go. */
  readonly target: Vec2Tuple | null;
  /** 1-based step number and step count, for the phone's checklist. */
  readonly step: number;
  readonly stepCount: number;
}

export const FREE_ROAM: Objective = {
  heading: 'Free roam',
  text: 'Explore UCIS University. The next mission is still being written.',
  target: null,
  step: 0,
  stepCount: 0,
};

export class StoryDirector {
  constructor(private readonly state: StoryState) {}

  get mission(): MissionDef | undefined {
    return findMission(this.state.missionId);
  }

  /** Index of the first unfinished step, or the step count when all are done. */
  stepIndex(mission: MissionDef): number {
    const index = mission.steps.findIndex((step) => !this.state.hasFlag(step.doneWhen));
    return index === -1 ? mission.steps.length : index;
  }

  /**
   * Moves on to the next mission when the current one has no steps left.
   * Returns the mission that was just completed, if any.
   */
  settle(): MissionDef | undefined {
    const mission = this.mission;
    if (!mission || this.stepIndex(mission) < mission.steps.length) {
      return undefined;
    }
    this.state.setFlag(`${mission.id}_complete`);
    this.state.missionId = mission.next;
    return mission;
  }

  objective(): Objective {
    const mission = this.mission;
    if (!mission) {
      return FREE_ROAM;
    }
    const index = this.stepIndex(mission);
    const step = mission.steps[index];
    if (!step) {
      return FREE_ROAM;
    }
    return {
      heading: `${mission.code} · ${mission.title}`,
      text: step.objective,
      target: step.target ? planPoint(step.target) : null,
      step: index + 1,
      stepCount: mission.steps.length,
    };
  }
}
