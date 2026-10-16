/**
 * Character creation (GAME_DESIGN.md §4), the parts that need no 3D art: name,
 * how the player is addressed, programme and home. Body, skin, face, hair and
 * outfit wait for the rigged character pipeline (roadmap stage D).
 */

import {
  ADDRESS_LABELS,
  AKAN_DAY_NAMES,
  HOMES,
  PROGRAMME_BLURBS,
  PROGRAMMES,
  isAddressForm,
  isHomeId,
  isProgrammeId,
  type PlayerProfile,
} from '../story/types';
import { requireElement } from './dom';

export class CharacterCreation {
  private readonly root = requireElement('creation-screen');
  private readonly form = requireElement<HTMLFormElement>('creation-form');
  private readonly nameInput = requireElement<HTMLInputElement>('creation-name');
  private readonly homeSelect = requireElement<HTMLSelectElement>('creation-home');
  private suggestionCount = 0;

  constructor(private readonly onConfirm: (profile: PlayerProfile) => void) {
    radioGroup(requireElement('creation-address'), 'address', ADDRESS_LABELS, 'they', null);
    radioGroup(requireElement('creation-programme'), 'programme', PROGRAMMES, 'engineering', PROGRAMME_BLURBS);
    for (const [id, label] of Object.entries(HOMES)) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = label;
      this.homeSelect.append(option);
    }

    this.nameInput.placeholder = `e.g. ${this.dayName(false)}`;
    requireElement('creation-suggest').addEventListener('click', () => {
      this.nameInput.value = this.dayName(true);
    });
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.onConfirm(this.readProfile());
    });
  }

  show(): void {
    this.root.hidden = false;
    requireElement<HTMLButtonElement>('creation-confirm').focus();
  }

  hide(): void {
    this.root.hidden = true;
  }

  private readProfile(): PlayerProfile {
    const data = new FormData(this.form);
    const address = data.get('address');
    const programme = data.get('programme');
    const home = this.homeSelect.value;
    const typed = this.nameInput.value.replace(/\s+/g, ' ').trim();
    return {
      name: typed || this.dayName(false),
      address: isAddressForm(address) ? address : 'they',
      programme: isProgrammeId(programme) ? programme : 'engineering',
      home: isHomeId(home) ? home : 'coastal',
    };
  }

  /**
   * The Akan name for today. "They" alternates between the two on each press,
   * since a day name is gendered and the player can pick either.
   */
  private dayName(cycle: boolean): string {
    const pair = AKAN_DAY_NAMES[new Date().getDay()] ?? ['Kofi', 'Afua'];
    const address = new FormData(this.form).get('address');
    if (address === 'he') {
      return pair[0];
    }
    if (address === 'she') {
      return pair[1];
    }
    if (cycle) {
      this.suggestionCount += 1;
    }
    return pair[this.suggestionCount % 2] ?? pair[0];
  }
}

function radioGroup(
  container: HTMLElement,
  name: string,
  labels: Readonly<Record<string, string>>,
  checked: string,
  details: Readonly<Record<string, string>> | null,
): void {
  for (const [value, label] of Object.entries(labels)) {
    const option = document.createElement('label');
    option.className = 'creation-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = value === checked;
    const text = document.createElement('span');
    text.className = 'creation-option-text';
    const title = document.createElement('strong');
    title.textContent = label;
    text.append(title);
    const detail = details?.[value];
    if (detail) {
      const small = document.createElement('small');
      small.textContent = detail;
      text.append(small);
    }
    option.append(input, text);
    container.append(option);
  }
}
