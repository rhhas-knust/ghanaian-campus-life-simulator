/**
 * Data-driven conversations (GAME_DESIGN.md §7).
 *
 * One JSON file per conversation in `data/dialogue/`. A file is a set of nodes;
 * each node has a speaker and a line, and either a `next` node, 2–4 `choices`,
 * or neither (the conversation ends). Nodes and choices can carry `effects`
 * (set a flag, change a relationship or reputation) and choices can carry an
 * `if` condition, so a line can exist only for one programme or after one
 * event. A node with `branch` instead of a line is a silent fork: the first
 * branch whose `if` holds is taken, otherwise `next` — which is how a
 * conversation reacts to what the player did earlier.
 *
 * The JSON is validated when the game starts. A typo in a dialogue file is
 * reported with the file and node name, instead of surfacing as a silent dead
 * end halfway through a conversation on someone's phone.
 */

import {
  isProgrammeId,
  isReputationAxis,
  PROGRAMMES,
  HOMES,
  type Condition,
  type Effect,
  type PlayerProfile,
} from './types';
import type { StoryState } from './StoryState';

export interface DialogueChoice {
  readonly text: string;
  readonly next: string | null;
  /** Shown with the "major decision" marker; triggers an auto-save. */
  readonly major: boolean;
  readonly if?: Condition;
  readonly effects: readonly Effect[];
}

export interface DialogueNode {
  /** A cast id, `player` or `narrator`. Empty for a branch node. */
  readonly speaker: string;
  readonly text: string;
  readonly next: string | null;
  readonly choices: readonly DialogueChoice[];
  readonly effects: readonly Effect[];
  /** Silent forks, tried in order before falling through to `next`. */
  readonly branch: readonly { readonly if: Condition; readonly next: string }[];
}

export interface DialogueTree {
  readonly id: string;
  readonly start: string;
  readonly nodes: Readonly<Record<string, DialogueNode>>;
}

// ------------------------------------------------------------------ loading

const RAW_DIALOGUES = import.meta.glob<unknown>('./data/dialogue/*.json', { eager: true, import: 'default' });

/** Every conversation in the game, keyed by its `id`. Throws on invalid data. */
export const DIALOGUES: ReadonlyMap<string, DialogueTree> = (() => {
  const trees = new Map<string, DialogueTree>();
  for (const [path, raw] of Object.entries(RAW_DIALOGUES)) {
    const tree = parseDialogue(raw, path);
    if (trees.has(tree.id)) {
      throw new Error(`Dialogue id "${tree.id}" is used twice (${path})`);
    }
    trees.set(tree.id, tree);
  }
  return trees;
})();

export function parseDialogue(raw: unknown, source: string): DialogueTree {
  const fail = (message: string): never => {
    throw new Error(`Dialogue ${source}: ${message}`);
  };
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.start !== 'string' || !isRecord(raw.nodes)) {
    return fail('needs "id", "start" and "nodes"');
  }

  const nodes: Record<string, DialogueNode> = {};
  for (const [nodeId, rawNode] of Object.entries(raw.nodes)) {
    if (isRecord(rawNode) && rawNode.branch !== undefined) {
      if (!Array.isArray(rawNode.branch) || rawNode.branch.length === 0) {
        return fail(`node "${nodeId}" needs a non-empty "branch" list`);
      }
      nodes[nodeId] = {
        speaker: '',
        text: '',
        next: optionalString(rawNode.next, fail, nodeId),
        choices: [],
        effects: parseEffects(rawNode.effects, fail, nodeId),
        branch: rawNode.branch.map((entry) => {
          if (!isRecord(entry) || typeof entry.next !== 'string') {
            return fail(`a branch in node "${nodeId}" needs "if" and "next"`);
          }
          return { if: parseCondition(entry.if, fail, nodeId), next: entry.next };
        }),
      };
      continue;
    }
    if (!isRecord(rawNode) || typeof rawNode.speaker !== 'string' || typeof rawNode.text !== 'string') {
      return fail(`node "${nodeId}" needs "speaker" and "text"`);
    }
    const choices: DialogueChoice[] = [];
    if (rawNode.choices !== undefined) {
      if (!Array.isArray(rawNode.choices) || rawNode.choices.length < 1 || rawNode.choices.length > 4) {
        return fail(`node "${nodeId}" needs 1–4 choices`);
      }
      for (const rawChoice of rawNode.choices) {
        if (!isRecord(rawChoice) || typeof rawChoice.text !== 'string') {
          return fail(`a choice in node "${nodeId}" needs "text"`);
        }
        const condition = rawChoice.if === undefined ? undefined : parseCondition(rawChoice.if, fail, nodeId);
        choices.push({
          text: rawChoice.text,
          next: optionalString(rawChoice.next, fail, nodeId),
          major: rawChoice.major === true,
          ...(condition ? { if: condition } : {}),
          effects: parseEffects(rawChoice.effects, fail, nodeId),
        });
      }
    }
    nodes[nodeId] = {
      speaker: rawNode.speaker,
      text: rawNode.text,
      next: optionalString(rawNode.next, fail, nodeId),
      choices,
      effects: parseEffects(rawNode.effects, fail, nodeId),
      branch: [],
    };
  }

  // Every link must land somewhere.
  const exists = (id: string | null): boolean => id === null || id in nodes;
  if (!(raw.start in nodes)) {
    fail(`start node "${raw.start}" does not exist`);
  }
  for (const [nodeId, node] of Object.entries(nodes)) {
    if (
      !exists(node.next) ||
      node.choices.some((choice) => !exists(choice.next)) ||
      node.branch.some((entry) => !exists(entry.next))
    ) {
      fail(`node "${nodeId}" links to a node that does not exist`);
    }
    if (node.choices.length > 0 && node.choices.every((choice) => choice.if !== undefined)) {
      fail(`node "${nodeId}" needs at least one choice without a condition, so it can never be empty`);
    }
  }
  return { id: raw.id, start: raw.start, nodes };
}

function parseCondition(raw: unknown, fail: (message: string) => never, nodeId: string): Condition {
  if (!isRecord(raw)) {
    return fail(`bad "if" in node "${nodeId}"`);
  }
  if (raw.programme !== undefined && !isProgrammeId(raw.programme)) {
    return fail(`unknown programme in node "${nodeId}"`);
  }
  const atLeast = raw.atLeast;
  if (atLeast !== undefined && (!isRecord(atLeast) || typeof atLeast.who !== 'string' || typeof atLeast.value !== 'number')) {
    return fail(`"atLeast" in node "${nodeId}" needs "who" and "value"`);
  }
  return {
    ...(typeof raw.flag === 'string' ? { flag: raw.flag } : {}),
    ...(typeof raw.notFlag === 'string' ? { notFlag: raw.notFlag } : {}),
    ...(isProgrammeId(raw.programme) ? { programme: raw.programme } : {}),
    ...(isRecord(atLeast) && typeof atLeast.who === 'string' && typeof atLeast.value === 'number'
      ? { atLeast: { who: atLeast.who, value: atLeast.value } }
      : {}),
  };
}

function parseEffects(raw: unknown, fail: (message: string) => never, nodeId: string): Effect[] {
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    return fail(`"effects" in node "${nodeId}" must be a list`);
  }
  return raw.map((effect): Effect => {
    if (isRecord(effect)) {
      if (effect.type === 'flag' && typeof effect.flag === 'string') {
        return { type: 'flag', flag: effect.flag };
      }
      if (effect.type === 'relationship' && typeof effect.who === 'string' && typeof effect.delta === 'number') {
        return { type: 'relationship', who: effect.who, delta: effect.delta };
      }
      if (effect.type === 'reputation' && isReputationAxis(effect.axis) && typeof effect.delta === 'number') {
        return { type: 'reputation', axis: effect.axis, delta: effect.delta };
      }
    }
    return fail(`bad effect in node "${nodeId}": ${JSON.stringify(effect)}`);
  });
}

function optionalString(raw: unknown, fail: (message: string) => never, nodeId: string): string | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  return typeof raw === 'string' ? raw : fail(`"next" in node "${nodeId}" must be a node id`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ------------------------------------------------------------------ running

/** What the dialogue box shows for the current line. */
export interface DialogueLine {
  readonly speaker: string;
  readonly text: string;
  /** Only the choices whose conditions hold, with their index into `select`. */
  readonly choices: readonly { readonly index: number; readonly text: string; readonly major: boolean }[];
}

/**
 * Steps through one conversation, applying effects to the story state as it
 * goes. Knows nothing about the screen.
 */
export class DialogueRunner {
  private node: DialogueNode | null;
  private majorChoiceMade = false;

  constructor(
    private readonly tree: DialogueTree,
    private readonly state: StoryState,
  ) {
    this.node = null;
    this.enter(tree.start);
  }

  get id(): string {
    return this.tree.id;
  }

  get finished(): boolean {
    return this.node === null;
  }

  /** True once the player has made a choice marked `major`. */
  get madeMajorChoice(): boolean {
    return this.majorChoiceMade;
  }

  current(): DialogueLine | null {
    const node = this.node;
    if (!node) {
      return null;
    }
    return {
      speaker: node.speaker,
      text: fillText(node.text, this.state.profile),
      choices: node.choices
        .map((choice, index) => ({ choice, index }))
        .filter(({ choice }) => this.state.meets(choice.if))
        .map(({ choice, index }) => ({ index, text: fillText(choice.text, this.state.profile), major: choice.major })),
    };
  }

  /** Moves past a line that has no choices. Ignored while a choice is waiting. */
  advance(): void {
    const node = this.node;
    if (!node || node.choices.length > 0) {
      return;
    }
    this.enter(node.next);
  }

  select(index: number): void {
    const choice = this.node?.choices[index];
    if (!choice || !this.state.meets(choice.if)) {
      return;
    }
    for (const effect of choice.effects) {
      this.state.apply(effect);
    }
    if (choice.major) {
      this.majorChoiceMade = true;
    }
    this.enter(choice.next);
  }

  private enter(nodeId: string | null): void {
    let next = nodeId;
    // Follow silent forks until a line is reached. The guard stops a data
    // mistake (two branches pointing at each other) from hanging the game.
    for (let hops = 0; hops < 32; hops += 1) {
      this.node = next === null ? null : (this.tree.nodes[next] ?? null);
      for (const effect of this.node?.effects ?? []) {
        this.state.apply(effect);
      }
      if (!this.node || this.node.branch.length === 0) {
        return;
      }
      next = this.node.branch.find((entry) => this.state.meets(entry.if))?.next ?? this.node.next;
    }
    this.node = null;
  }
}

/** Replaces `{name}`, `{programme}` and `{home}` in a line. */
export function fillText(text: string, profile: PlayerProfile): string {
  return text
    .replaceAll('{name}', profile.name)
    .replaceAll('{programme}', PROGRAMMES[profile.programme])
    .replaceAll('{home}', HOMES[profile.home]);
}
