/**
 * The conversation panel along the bottom of the screen: a portrait, the
 * speaker's name, the line, and either "tap to continue" or 2–4 choices.
 *
 * Told what to show by the game; reports taps and choices back. Choices can be
 * picked with the number keys on a keyboard. Text only — no voice acting for
 * now (GAME_DESIGN.md §7).
 */

import { requireElement } from './dom';

export interface DialogueSpeaker {
  readonly name: string;
  readonly role: string;
  /** CSS colour for the portrait disc. */
  readonly accent: string;
}

export interface DialogueView {
  readonly speaker: DialogueSpeaker;
  readonly text: string;
  readonly choices: readonly { readonly index: number; readonly text: string; readonly major: boolean }[];
}

export interface DialogueCallbacks {
  readonly onAdvance: () => void;
  readonly onChoose: (index: number) => void;
}

export class DialogueBox {
  private readonly root = requireElement('dialogue');
  private readonly panel = requireElement('dialogue-panel');
  private readonly portrait = requireElement('dialogue-portrait');
  private readonly name = requireElement('dialogue-name');
  private readonly role = requireElement('dialogue-role');
  private readonly text = requireElement('dialogue-text');
  private readonly choices = requireElement('dialogue-choices');
  private readonly continueHint = requireElement('dialogue-continue');
  private choiceIndices: number[] = [];

  constructor(private readonly callbacks: DialogueCallbacks) {
    this.panel.addEventListener('click', (event) => {
      // A tap on a choice button is a choice, not "next line".
      if (event.target instanceof Element && event.target.closest('button')) {
        return;
      }
      if (this.choiceIndices.length === 0) {
        this.callbacks.onAdvance();
      }
    });
    window.addEventListener('keydown', this.handleKeyDown);
  }

  get isVisible(): boolean {
    return !this.root.hidden;
  }

  show(view: DialogueView, touchMode: boolean): void {
    this.root.hidden = false;
    this.portrait.textContent = initials(view.speaker.name);
    this.portrait.style.background = view.speaker.accent;
    this.name.textContent = view.speaker.name;
    this.role.textContent = view.speaker.role;
    this.text.textContent = view.text;

    this.choices.replaceChildren();
    this.choiceIndices = view.choices.map((choice) => choice.index);
    view.choices.forEach((choice, position) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = choice.major ? 'dialogue-choice dialogue-choice--major' : 'dialogue-choice';
      const number = document.createElement('span');
      number.className = 'dialogue-choice-key';
      number.textContent = String(position + 1);
      const label = document.createElement('span');
      label.textContent = choice.text;
      button.append(number, label);
      if (choice.major) {
        // Marks a big decision, so the player knows something is at stake.
        button.title = 'Major decision';
        const marker = document.createElement('span');
        marker.className = 'dialogue-major';
        marker.textContent = '◆';
        button.append(marker);
      }
      button.addEventListener('click', () => this.callbacks.onChoose(choice.index));
      this.choices.append(button);
    });
    this.choices.hidden = view.choices.length === 0;
    this.continueHint.hidden = view.choices.length > 0;
    this.continueHint.textContent = touchMode ? 'Tap to continue ▸' : 'Click, E or Space to continue ▸';
  }

  hide(): void {
    this.root.hidden = true;
    this.choiceIndices = [];
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.root.hidden || event.repeat) {
      return;
    }
    const position = Number(event.key) - 1;
    const index = this.choiceIndices[position];
    if (Number.isInteger(position) && index !== undefined) {
      event.preventDefault();
      this.callbacks.onChoose(index);
    }
  };
}

function initials(name: string): string {
  const words = name.replace(/^(Mr|Mrs|Ms|Dr)\.\s+/, '').split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}
