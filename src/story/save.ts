/**
 * The one save slot, in localStorage.
 *
 * Static hosting means no accounts and no cloud saves (AGENTS.md hard
 * constraint 1), so the save lives in the browser that played it. Clearing
 * site data, or switching browser or phone, starts a new story.
 */

import { STORAGE_KEYS } from '../config/settings';
import { readStoredValue, removeStoredValue, writeStoredValue } from '../utils/device';
import { StoryState } from './StoryState';

export function loadStory(): StoryState | null {
  const text = readStoredValue(STORAGE_KEYS.story);
  if (text === null) {
    return null;
  }
  try {
    return StoryState.fromSave(JSON.parse(text));
  } catch {
    return null;
  }
}

export function hasSavedStory(): boolean {
  return loadStory() !== null;
}

export function saveStory(state: StoryState): void {
  writeStoredValue(STORAGE_KEYS.story, JSON.stringify(state.toSave()));
}

export function deleteSavedStory(): void {
  removeStoredValue(STORAGE_KEYS.story);
}
