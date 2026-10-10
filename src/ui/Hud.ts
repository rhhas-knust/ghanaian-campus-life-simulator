/**
 * In-game heads-up display: location label, interaction prompt, crosshair,
 * pause button and the touch control layer.
 *
 * The HUD never reads game state — the game pushes to it. That keeps the DOM
 * writes down to the few frames where something actually changed, which is
 * worth doing: layout thrash from per-frame DOM writes is a real cost on a
 * phone, even for a handful of nodes.
 */

import type { Interactable } from '../types';
import { requireElement } from './dom';

export interface HudElements {
  readonly root: HTMLElement;
  readonly locationLabel: HTMLElement;
  readonly crosshair: HTMLElement;
  readonly prompt: HTMLElement;
  readonly promptKey: HTMLElement;
  readonly promptText: HTMLElement;
  readonly pauseButton: HTMLButtonElement;
  readonly touchControls: HTMLElement;
  readonly joystick: HTMLElement;
  readonly joystickKnob: HTMLElement;
  readonly lookSurface: HTMLElement;
  readonly interactButton: HTMLButtonElement;
}

export class Hud {
  readonly elements: HudElements;

  private currentZone = '';
  private currentFocusId: string | null = null;

  constructor() {
    this.elements = {
      root: requireElement('hud'),
      locationLabel: requireElement('location-label'),
      crosshair: requireElement('crosshair'),
      prompt: requireElement('interaction-prompt'),
      promptKey: requireElement('interaction-key'),
      promptText: requireElement('interaction-text'),
      pauseButton: requireElement<HTMLButtonElement>('pause-button'),
      touchControls: requireElement('touch-controls'),
      joystick: requireElement('touch-joystick'),
      joystickKnob: requireElement('touch-joystick-knob'),
      lookSurface: requireElement('touch-look'),
      interactButton: requireElement<HTMLButtonElement>('touch-interact'),
    };
  }

  setVisible(visible: boolean): void {
    this.elements.root.hidden = !visible;
  }

  /** Shows the thumbstick layer and hides the mouse crosshair, or vice versa. */
  setTouchMode(touch: boolean): void {
    this.elements.touchControls.hidden = !touch;
    this.elements.crosshair.hidden = touch;
  }

  setZoneName(name: string): void {
    if (name === this.currentZone) {
      return;
    }
    this.currentZone = name;
    this.elements.locationLabel.textContent = name;
  }

  /** `null` hides the prompt. The key hint differs between touch and desktop. */
  setFocus(focus: Interactable | null, touchMode: boolean): void {
    const focusId = focus?.id ?? null;
    if (focusId === this.currentFocusId) {
      return;
    }
    this.currentFocusId = focusId;

    if (!focus) {
      this.elements.prompt.hidden = true;
      return;
    }

    this.elements.promptKey.textContent = touchMode ? 'TAP' : 'E';
    this.elements.promptText.textContent = focus.promptLabel;
    this.elements.prompt.hidden = false;
  }

  onPauseClicked(handler: () => void): void {
    this.elements.pauseButton.addEventListener('click', handler);
  }
}
