/**
 * The in-game phone (GAME_DESIGN.md §9): objectives, message threads and the
 * player's profile. Later stages add the timetable and the mobile-money wallet.
 *
 * Like the HUD, it never reads game state. The game builds a `PhoneView` and
 * the phone draws it; opening a thread is reported back, because reading a
 * message can complete a mission step.
 */

import { requireElement } from './dom';

export type PhoneTab = 'objectives' | 'messages' | 'profile';

export interface PhoneView {
  readonly clock: string;
  readonly day: string;
  readonly mission: {
    readonly heading: string;
    readonly current: string;
    readonly steps: readonly { readonly text: string; readonly done: boolean }[];
  };
  readonly threads: readonly {
    readonly id: string;
    readonly title: string;
    readonly unread: boolean;
    readonly messages: readonly { readonly from: string; readonly text: string }[];
  }[];
  readonly profile: readonly { readonly label: string; readonly value: string }[];
  readonly reputation: readonly { readonly label: string; readonly value: number }[];
  readonly people: readonly { readonly name: string; readonly role: string; readonly standing: string; readonly accent: string }[];
}

export interface PhoneCallbacks {
  readonly onClose: () => void;
  readonly onOpenMap: () => void;
  readonly onOpenThread: (id: string) => void;
}

export class PhoneMenu {
  private readonly root = requireElement('phone-screen');
  private readonly clock = requireElement('phone-clock');
  private readonly day = requireElement('phone-day');
  private readonly page = requireElement('phone-page');
  private readonly tabBadge = requireElement('phone-tab-badge');
  private readonly closeButton = requireElement<HTMLButtonElement>('phone-close');
  private readonly tabs: HTMLButtonElement[];
  private tab: PhoneTab = 'objectives';
  private openThread: string | null = null;
  private view: PhoneView | null = null;

  constructor(private readonly callbacks: PhoneCallbacks) {
    this.tabs = [...this.root.querySelectorAll<HTMLButtonElement>('.phone-tab')];
    for (const button of this.tabs) {
      button.addEventListener('click', () => {
        const tab = button.dataset.tab;
        if (tab === 'objectives' || tab === 'messages' || tab === 'profile') {
          this.tab = tab;
          this.openThread = null;
          this.draw();
        }
      });
    }
    this.closeButton.addEventListener('click', () => this.callbacks.onClose());
    requireElement('phone-map').addEventListener('click', () => this.callbacks.onOpenMap());
  }

  get isVisible(): boolean {
    return !this.root.hidden;
  }

  show(view: PhoneView, tab?: PhoneTab): void {
    if (tab) {
      this.tab = tab;
      this.openThread = null;
    }
    this.view = view;
    this.root.hidden = false;
    this.draw();
    this.closeButton.focus();
  }

  /** Redraws with fresh data, keeping the current tab and thread. */
  refresh(view: PhoneView): void {
    this.view = view;
    if (!this.root.hidden) {
      this.draw();
    }
  }

  hide(): void {
    this.root.hidden = true;
  }

  private draw(): void {
    const view = this.view;
    if (!view) {
      return;
    }
    this.clock.textContent = view.clock;
    this.day.textContent = view.day;
    this.tabBadge.hidden = !view.threads.some((thread) => thread.unread);
    for (const button of this.tabs) {
      const selected = button.dataset.tab === this.tab;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', String(selected));
    }

    this.page.replaceChildren();
    if (this.tab === 'objectives') {
      this.drawObjectives(view);
    } else if (this.tab === 'messages') {
      this.drawMessages(view);
    } else {
      this.drawProfile(view);
    }
    this.page.scrollTop = 0;
  }

  private drawObjectives(view: PhoneView): void {
    this.page.append(element('p', 'phone-heading', view.mission.heading));
    this.page.append(element('p', 'phone-current', view.mission.current));
    if (view.mission.steps.length > 0) {
      const list = element('ol', 'phone-steps');
      for (const step of view.mission.steps) {
        const item = element('li', step.done ? 'is-done' : '', step.text);
        list.append(item);
      }
      this.page.append(list);
    }
  }

  private drawMessages(view: PhoneView): void {
    const thread = view.threads.find((candidate) => candidate.id === this.openThread);
    if (thread) {
      const back = element('button', 'phone-back', '‹ All chats');
      back.setAttribute('type', 'button');
      back.addEventListener('click', () => {
        this.openThread = null;
        this.draw();
      });
      this.page.append(back, element('p', 'phone-heading', thread.title));
      for (const message of thread.messages) {
        const bubble = element('div', 'phone-bubble');
        bubble.append(element('p', 'phone-bubble-from', message.from), element('p', 'phone-bubble-text', message.text));
        this.page.append(bubble);
      }
      return;
    }

    for (const candidate of view.threads) {
      const row = element('button', candidate.unread ? 'phone-thread is-unread' : 'phone-thread');
      row.setAttribute('type', 'button');
      const last = candidate.messages[candidate.messages.length - 1];
      row.append(element('span', 'phone-thread-title', candidate.title), element('span', 'phone-thread-preview', last?.text ?? ''));
      row.addEventListener('click', () => {
        this.openThread = candidate.id;
        this.callbacks.onOpenThread(candidate.id);
        this.draw();
      });
      this.page.append(row);
    }
  }

  private drawProfile(view: PhoneView): void {
    const facts = element('dl', 'phone-facts');
    for (const entry of view.profile) {
      facts.append(element('dt', '', entry.label), element('dd', '', entry.value));
    }
    this.page.append(facts);

    this.page.append(element('p', 'phone-heading', 'Reputation'));
    for (const axis of view.reputation) {
      const row = element('div', 'phone-meter');
      const bar = element('div', 'phone-meter-bar');
      const fill = element('div', 'phone-meter-fill');
      fill.style.width = `${axis.value}%`;
      bar.append(fill);
      row.append(element('span', 'phone-meter-label', axis.label), bar);
      this.page.append(row);
    }

    this.page.append(element('p', 'phone-heading', 'People'));
    if (view.people.length === 0) {
      this.page.append(element('p', 'phone-empty', 'Nobody yet. Go and say hello.'));
    }
    for (const person of view.people) {
      const row = element('div', 'phone-person');
      const dot = element('span', 'phone-person-dot');
      dot.style.background = person.accent;
      const text = element('span', 'phone-person-text');
      text.append(element('strong', '', person.name), element('span', '', ` · ${person.role}`));
      row.append(dot, text, element('span', 'phone-person-standing', person.standing));
      this.page.append(row);
    }
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string): HTMLElementTagNameMap[K] {
  const created = document.createElement(tag);
  if (className) {
    created.className = className;
  }
  if (text !== undefined) {
    created.textContent = text;
  }
  return created;
}
