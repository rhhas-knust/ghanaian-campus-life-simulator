/**
 * Phone message threads, from `data/messages.json`.
 *
 * A thread appears once its `unlockedBy` flag is set. Opening a thread with a
 * `readFlag` sets that flag, which is how "read the group chat" completes a
 * mission step without the phone knowing anything about missions.
 */

import rawMessages from './data/messages.json';
import { fillText } from './dialogue';
import type { StoryState } from './StoryState';

export interface PhoneMessage {
  readonly from: string;
  readonly text: string;
}

export interface MessageThread {
  readonly id: string;
  readonly title: string;
  readonly unlockedBy: string | null;
  readonly readFlag: string | null;
  readonly messages: readonly PhoneMessage[];
}

export const MESSAGE_THREADS: readonly MessageThread[] = parseThreads(rawMessages);

/** Unlocked threads, newest unlock first, with the player's name filled in. */
export function visibleThreads(state: StoryState): MessageThread[] {
  return MESSAGE_THREADS.filter((thread) => thread.unlockedBy === null || state.hasFlag(thread.unlockedBy))
    .reverse()
    .map((thread) => ({
      ...thread,
      messages: thread.messages.map((message) => ({ from: message.from, text: fillText(message.text, state.profile) })),
    }));
}

/** True when an unlocked thread has a read flag that is not yet set. */
export function hasUnreadThread(state: StoryState): boolean {
  return visibleThreads(state).some((thread) => thread.readFlag !== null && !state.hasFlag(thread.readFlag));
}

function parseThreads(raw: unknown): MessageThread[] {
  const threads = isRecord(raw) && Array.isArray(raw.threads) ? raw.threads : null;
  if (!threads) {
    throw new Error('messages.json needs a "threads" list');
  }
  return threads.map((thread, index): MessageThread => {
    if (!isRecord(thread) || typeof thread.id !== 'string' || typeof thread.title !== 'string' || !Array.isArray(thread.messages)) {
      throw new Error(`messages.json: thread ${index} needs "id", "title" and "messages"`);
    }
    return {
      id: thread.id,
      title: thread.title,
      unlockedBy: typeof thread.unlockedBy === 'string' ? thread.unlockedBy : null,
      readFlag: typeof thread.readFlag === 'string' ? thread.readFlag : null,
      messages: thread.messages.map((message) => {
        if (!isRecord(message) || typeof message.from !== 'string' || typeof message.text !== 'string') {
          throw new Error(`messages.json: a message in "${thread.id}" needs "from" and "text"`);
        }
        return { from: message.from, text: message.text };
      }),
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
