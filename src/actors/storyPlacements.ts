/**
 * Turns the story's cast, places and entrances into what the interaction and
 * collision systems understand, for ONE location at the current point in the
 * story: a "Talk to …" interactable and a small collider per character who is
 * here now, a "use" interactable per story place, and a door per entrance.
 *
 * Pure data in, descriptors out — the same contract a world module has, so the
 * interaction system never needs to know what a character or a door is. The
 * game asks again whenever the location or the story changes.
 */

import { Vector3 } from 'three';

import { ENTRANCES, locationPoint, type LocationId } from '../config/interiors';
import { STORY_SETTINGS } from '../config/settings';
import { CAST, type CastMember, type CastPost } from '../story/data/cast';
import { STORY_PLACES } from '../story/data/places';
import type { StoryState } from '../story/StoryState';
import type { Collider, Interactable } from '../types';

export interface FigurePlacement {
  readonly id: string;
  readonly x: number;
  readonly z: number;
  readonly yawDegrees: number;
}

export interface StoryPlacements {
  readonly interactables: readonly Interactable[];
  readonly colliders: readonly Collider[];
  readonly figures: readonly FigurePlacement[];
  /** Changes whenever anything above does, so the game can skip identical rebuilds. */
  readonly signature: string;
}

/** Where a character is right now, or `undefined` if they are not around. */
export function currentPost(member: CastMember, story: StoryState): CastPost | undefined {
  return member.posts.find((post) => story.meets(post.when));
}

export function buildStoryPlacements(location: LocationId, story: StoryState): StoryPlacements {
  const interactables: Interactable[] = [];
  const colliders: Collider[] = [];
  const figures: FigurePlacement[] = [];

  for (const member of CAST) {
    const post = currentPost(member, story);
    if (!post || (post.location ?? 'campus') !== location) {
      continue;
    }
    const [x, z] = locationPoint(post.location, post.at);
    figures.push({ id: member.id, x, z, yawDegrees: post.yawDegrees });
    colliders.push({ kind: 'circle', x, z, radius: 0.35, sourceId: `npc:${member.id}` });
    if (member.talks.length > 0) {
      interactables.push({
        id: `npc:${member.id}`,
        position: new Vector3(x, 1.5, z),
        radius: STORY_SETTINGS.talkRadius,
        promptLabel: `Talk to ${member.name}`,
        eyebrow: member.role,
        title: member.name,
        body: [],
        action: { kind: 'talk', who: member.id },
      });
    }
  }

  for (const place of STORY_PLACES) {
    if ((place.location ?? 'campus') !== location || !story.meets(place.visibleWhen)) {
      continue;
    }
    const [x, z] = locationPoint(place.location, place.at);
    interactables.push({
      id: `place:${place.id}`,
      position: new Vector3(x, 1.2, z),
      radius: place.radius,
      promptLabel: place.promptLabel,
      eyebrow: place.eyebrow,
      title: place.title,
      body: [],
      action: { kind: 'place', place: place.id },
    });
  }

  if (location === 'campus') {
    for (const entrance of ENTRANCES) {
      if (!story.meets(entrance.visibleWhen)) {
        continue;
      }
      const [x, z] = locationPoint(undefined, entrance.outdoor.at);
      interactables.push({
        id: `entrance:${entrance.id}`,
        position: new Vector3(x, 1.4, z),
        radius: entrance.outdoor.radius,
        promptLabel: entrance.promptLabel,
        eyebrow: entrance.eyebrow,
        title: entrance.promptLabel,
        body: entrance.lockedText,
        action: { kind: 'enter', entrance: entrance.id },
      });
    }
  }

  const signature = [
    location,
    ...figures.map((figure) => `${figure.id}@${figure.x.toFixed(2)},${figure.z.toFixed(2)}`),
    ...interactables.map((interactable) => interactable.id),
  ].join('|');
  return { interactables, colliders, figures, signature };
}

/** Who stands where in the arrival cinematic, before any story exists. */
export function openingFigures(): FigurePlacement[] {
  const figures: FigurePlacement[] = [];
  for (const member of CAST) {
    if (member.opening) {
      const [x, z] = locationPoint(undefined, member.opening.at);
      figures.push({ id: member.id, x, z, yawDegrees: member.opening.yawDegrees });
    }
  }
  return figures;
}
