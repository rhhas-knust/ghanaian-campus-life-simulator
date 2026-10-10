/**
 * Full-screen overlays: loading, start, pause and the sign read-out.
 *
 * All four are static markup in `index.html`; this class only toggles them and
 * fills in text. The pause overlay also owns the two settings the player can
 * change — graphics quality and look sensitivity — and reports changes upwards
 * rather than acting on them, because changing quality means rebuilding the
 * renderer, which is the game's job and not the UI's.
 */

import { QUALITY_PRESETS, type QualityLevel } from '../config/settings';
import type { Interactable } from '../types';
import { DESKTOP_CONTROLS, TOUCH_CONTROLS } from './controls';
import { renderControlsList, renderTextBlock, requireElement } from './dom';

export interface OverlayCallbacks {
  readonly onStart: () => void;
  readonly onResume: () => void;
  readonly onCloseInfo: () => void;
  readonly onQualityChange: (level: QualityLevel) => void;
  readonly onSensitivityChange: (value: number) => void;
}

export class Overlays {
  private readonly loadingScreen = requireElement('loading-screen');
  private readonly loadingText = requireElement('loading-text');
  private readonly loadingBarFill = requireElement('loading-bar-fill');

  private readonly startScreen = requireElement('start-screen');
  private readonly startButton = requireElement<HTMLButtonElement>('start-button');
  private readonly startControls = requireElement('controls-grid-start');

  private readonly pauseScreen = requireElement('pause-screen');
  private readonly resumeButton = requireElement<HTMLButtonElement>('resume-button');
  private readonly pauseControls = requireElement('controls-grid-pause');
  private readonly qualitySelect = requireElement<HTMLSelectElement>('quality-select');
  private readonly sensitivityRange = requireElement<HTMLInputElement>('sensitivity-range');

  private readonly infoScreen = requireElement('info-screen');
  private readonly infoEyebrow = requireElement('info-eyebrow');
  private readonly infoTitle = requireElement('info-title');
  private readonly infoBody = requireElement('info-body');
  private readonly infoClose = requireElement<HTMLButtonElement>('info-close');

  constructor(private readonly callbacks: OverlayCallbacks) {
    this.startButton.addEventListener('click', () => this.callbacks.onStart());
    this.resumeButton.addEventListener('click', () => this.callbacks.onResume());
    this.infoClose.addEventListener('click', () => this.callbacks.onCloseInfo());

    this.qualitySelect.addEventListener('change', () => {
      this.callbacks.onQualityChange(this.qualitySelect.value as QualityLevel);
    });
    this.sensitivityRange.addEventListener('input', () => {
      this.callbacks.onSensitivityChange(Number(this.sensitivityRange.value));
    });

    // Labels come from the settings presets so the menu can never drift out of
    // step with what the presets actually do.
    for (const option of Array.from(this.qualitySelect.options)) {
      const preset = QUALITY_PRESETS[option.value as QualityLevel];
      if (preset) {
        option.textContent = preset.label;
      }
    }
  }

  // ---------------------------------------------------------------- loading

  setLoadingProgress(fraction: number, message: string): void {
    const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
    this.loadingBarFill.style.width = `${percent}%`;
    this.loadingText.textContent = message;
  }

  hideLoading(): void {
    this.loadingScreen.hidden = true;
  }

  /** Replaces the loading screen with an unrecoverable error message. */
  showFatalError(message: string): void {
    this.loadingScreen.hidden = false;
    this.loadingBarFill.style.width = '100%';
    this.loadingText.textContent = message;
  }

  // ------------------------------------------------------------------ start

  showStart(): void {
    this.startScreen.hidden = false;
    // Focusing the button means the keyboard and a screen reader both land in
    // the right place, and Enter starts the game.
    this.startButton.focus();
  }

  hideStart(): void {
    this.startScreen.hidden = true;
  }

  // ------------------------------------------------------------------ pause

  showPause(): void {
    this.pauseScreen.hidden = false;
    this.resumeButton.focus();
  }

  hidePause(): void {
    this.pauseScreen.hidden = true;
  }

  get isPauseVisible(): boolean {
    return !this.pauseScreen.hidden;
  }

  // ------------------------------------------------------------------- info

  showInfo(interactable: Interactable): void {
    this.infoEyebrow.textContent = interactable.eyebrow;
    this.infoTitle.textContent = interactable.title;
    renderTextBlock(this.infoBody, interactable.body, interactable.bullets);
    this.infoScreen.hidden = false;
    this.infoClose.focus();
  }

  hideInfo(): void {
    this.infoScreen.hidden = true;
  }

  get isInfoVisible(): boolean {
    return !this.infoScreen.hidden;
  }

  // --------------------------------------------------------------- settings

  /** Shows the control list matching the player's actual input device. */
  setControlScheme(touch: boolean): void {
    const hints = touch ? TOUCH_CONTROLS : DESKTOP_CONTROLS;
    renderControlsList(this.startControls, hints);
    renderControlsList(this.pauseControls, hints);
  }

  syncSettings(quality: QualityLevel, sensitivity: number): void {
    this.qualitySelect.value = quality;
    this.sensitivityRange.value = String(sensitivity);
  }
}
