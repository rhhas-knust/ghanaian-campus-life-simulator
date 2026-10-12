/**
 * In-game heads-up display: pause button, location pill, minimap, camera
 * button, interaction prompt, swipe hint and the touch-control layer.
 *
 * The HUD never reads game state — the game pushes to it, and every setter
 * compares against the last value before touching the DOM. Per-frame DOM
 * writes cause layout work, which is a real cost on a phone.
 */

import type { CameraMode } from '../config/settings';
import type { Interactable } from '../types';
import { requireElement } from './dom';
import { Minimap } from './Minimap';

export interface HudElements {
  readonly root: HTMLElement;
  readonly locationLabel: HTMLElement;
  readonly prompt: HTMLElement;
  readonly promptKey: HTMLElement;
  readonly promptText: HTMLElement;
  readonly pauseButton: HTMLButtonElement;
  readonly cameraButton: HTMLButtonElement;
  readonly cameraLabel: HTMLElement;
  readonly lookHint: HTMLElement;
  readonly touchControls: HTMLElement;
  readonly joystick: HTMLElement;
  readonly joystickKnob: HTMLElement;
  readonly lookSurface: HTMLElement;
  readonly interactButton: HTMLButtonElement;
}

export class Hud {
  readonly elements: HudElements;
  private minimap: Minimap | null = null;

  private currentZone = '';
  private currentFocusId: string | null = null;
  private currentMode: CameraMode | null = null;

  constructor() {
    this.elements = {
      root: requireElement('hud'),
      locationLabel: requireElement('location-label'),
      prompt: requireElement('interaction-prompt'),
      promptKey: requireElement('interaction-key'),
      promptText: requireElement('interaction-text'),
      pauseButton: requireElement<HTMLButtonElement>('pause-button'),
      cameraButton: requireElement<HTMLButtonElement>('camera-button'),
      cameraLabel: requireElement('camera-button-label'),
      lookHint: requireElement('look-hint'),
      touchControls: requireElement('touch-controls'),
      joystick: requireElement('touch-joystick'),
      joystickKnob: requireElement('touch-joystick-knob'),
      lookSurface: requireElement('touch-look'),
      interactButton: requireElement<HTMLButtonElement>('touch-interact'),
    };
  }

  setVisible(visible: boolean): void {
    this.elements.root.hidden = !visible;
    // The minimap measures its on-screen size, so it is created once the HUD
    // is actually laid out.
    if (visible && !this.minimap) {
      this.minimap = new Minimap(requireElement<HTMLCanvasElement>('minimap-canvas'));
    }
  }

  /** Shows the thumbsticks (touch) or the crosshair and key hints (desktop). */
  setTouchMode(touch: boolean): void {
    this.elements.touchControls.hidden = !touch;
    document.body.classList.toggle('is-touch', touch);
  }

  setZoneName(name: string): void {
    if (name === this.currentZone) {
      return;
    }
    this.currentZone = name;
    this.elements.locationLabel.textContent = name;
  }

  setCameraMode(mode: CameraMode): void {
    if (mode === this.currentMode) {
      return;
    }
    this.currentMode = mode;
    this.elements.cameraLabel.textContent = mode === 'first' ? '1st' : '3rd';
    this.elements.cameraButton.setAttribute(
      'aria-label',
      mode === 'first' ? 'Switch to third-person view' : 'Switch to first-person view',
    );
  }

  setLookHintVisible(visible: boolean): void {
    if (this.elements.lookHint.hidden === !visible) {
      return;
    }
    this.elements.lookHint.hidden = !visible;
  }

  updateMinimap(x: number, z: number, yaw: number, force = false): void {
    this.minimap?.update(x, z, yaw, force);
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

  onCameraClicked(handler: () => void): void {
    this.elements.cameraButton.addEventListener('click', handler);
  }
}
