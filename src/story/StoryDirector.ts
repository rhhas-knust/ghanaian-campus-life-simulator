/**
 * Works out what the player should be doing now, from the story state.
 *
 * Deliberately small: it reads flags and reports the current objective. It
 * does not know about the HUD, the camera or the world — the game asks it what
 * the objective is and tells the UI.
 */

import { locationPoint, type LocationId } from '../config/interiors';
import { MISSIONS, findMission, type MissionDef } from './data/missions';
import type { StoryState } from './StoryState';

export interface ObjectiveTarget {
  readonly location: LocationId;
  /** Metres, in that location's space. */
  readonly x: number;
  readonly z: number;
}

export interface Objective {
  /** `M01 · Akwaaba`, or `Free roam`. */
  readonly heading: string;
  readonly text: string;
  readonly target: ObjectiveTarget | null;
  /** 1-based step number and step count, for the phone's checklist. */
  readonly step: number;
  readonly stepCount: number;
}

export const FREE_ROAM: Objective = {
  heading: 'Free roam',
  text: 'Explore UCIS University. Mission 3 is still being written — sleep in A-214 to end the day.',
  target: null,
  step: 0,
  stepCount: 0,
};

export class StoryDirector {
  constructor(private readonly state: StoryState) {
    this.resume();
  }

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
    let target: ObjectiveTarget | null = null;
    if (step.target) {
      const [x, z] = locationPoint(step.target.location, step.target.at);
      target = { location: step.target.location ?? 'campus', x, z };
    }
    return {
      heading: `${mission.code} · ${mission.title}`,
      text: step.objective,
      target,
      step: index + 1,
      stepCount: mission.steps.length,
    };
  }

  /**
   * Picks up a mission that was added after the save was made. A player who
   * finished M01 before M02 existed has `missionId: null`; walking the chain
   * finds the first mission whose predecessor is complete and starts it.
   */
  private resume(): void {
    if (this.state.missionId !== null) {
      return;
    }
    for (const mission of MISSIONS) {
      if (this.state.hasFlag(`${mission.id}_complete`)) {
        continue;
      }
      const previous = MISSIONS.find((candidate) => candidate.next === mission.id);
      if (previous && this.state.hasFlag(`${previous.id}_complete`)) {
        this.state.missionId = mission.id;
      }
      return;
    }
  }
}
