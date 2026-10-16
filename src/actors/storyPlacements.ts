/**
 * Turns the story's cast and places into things the interaction and collision
 * systems understand: a "Talk to …" interactable and a small collider per
 * character, and a "use" interactable per story place.
 *
 * Pure data in, descriptors out — the same contract a world module has, so the
 * interaction system never needs to know what a character is.
 */

import { Vector3 } from 'three';

import { planPoint } from '../config/campusLayout';
import { STORY_SETTINGS } from '../config/settings';
import { CAST } from '../story/data/cast';
import { STORY_PLACES } from '../story/data/places';
import type { Collider, Interactable } from '../types';

export interface StoryPlacements {
  readonly interactables: readonly Interactable[];
  readonly colliders: readonly Collider[];
}

export function buildStoryPlacements(): StoryPlacements {
  const interactables: Interactable[] = [];
  const colliders: Collider[] = [];

  for (const member of CAST) {
    if (!member.post || member.appears !== 'always' || member.talks.length === 0) {
      continue;
    }
    const [x, z] = planPoint(member.post.at);
    colliders.push({ kind: 'circle', x, z, radius: 0.35, sourceId: `npc:${member.id}` });
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

  for (const place of STORY_PLACES) {
    const [x, z] = planPoint(place.at);
    interactables.push({
      id: `place:${place.id}`,
      position: new Vector3(x, 1.4, z),
      radius: place.radius,
      promptLabel: place.promptLabel,
      eyebrow: place.eyebrow,
      title: place.title,
      body: place.lockedText,
      action: { kind: place.action },
    });
  }

  return { interactables, colliders };
}
