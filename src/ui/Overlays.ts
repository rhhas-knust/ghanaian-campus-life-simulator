/**
 * Full-screen overlays: loading, start, pause, campus map and the sign reader.
 *
 * All of them are static markup in `index.html`; this class only toggles them,
 * fills in text and reports button presses upwards. Settings changes are
 * reported rather than acted on, because changing graphics quality means
 * rebuilding the world, which is the game's job and not the UI's.
 */

import { IMAGE_ASSETS, resolveAssetUrl } from '../config/assets';
import { ADDED_SINCE_MASTER_PLAN, BUILDINGS, PLAN } from '../config/campusLayout';
import type { CameraMode, QualityLevel } from '../config/settings';
import type { Interactable } from '../types';
import { DESKTOP_CONTROLS, TOUCH_CONTROLS } from './controls';
import { renderControlsList, renderTextBlock, requireElement } from './dom';

export interface OverlayCallbacks {
  readonly onStart: () => void;
  readonly onResume: () => void;
  readonly onCloseInfo: () => void;
  readonly onOpenMap: () => void;
  readonly onCloseMap: () => void;
  readonly onToggleCamera: () => void;
  readonly onQualityChange: (level: QualityLevel) => void;
  readonly onSensitivityChange: (value: number) => void;
  readonly onInvertYChange: (inverted: boolean) => void;
  readonly onAutoLevelChange: (enabled: boolean) => void;
}

export interface OverlaySettings {
  readonly quality: QualityLevel;
  readonly sensitivity: number;
  readonly invertY: boolean;
  readonly autoLevel: boolean;
  readonly cameraMode: CameraMode;
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
  private readonly mapButton = requireElement<HTMLButtonElement>('map-button');
  private readonly cameraModeButton = requireElement<HTMLButtonElement>('camera-mode-button');
  private readonly pauseControls = requireElement('controls-grid-pause');
  private readonly qualitySelect = requireElement<HTMLSelectElement>('quality-select');
  private readonly sensitivityRange = requireElement<HTMLInputElement>('sensitivity-range');
  private readonly invertYToggle = requireElement<HTMLInputElement>('invert-y-toggle');
  private readonly autoLevelToggle = requireElement<HTMLInputElement>('auto-level-toggle');

  private readonly mapScreen = requireElement('map-screen');
  private readonly mapImage = requireElement<HTMLImageElement>('map-image');
  private readonly mapMarker = requireElement('map-marker');
  private readonly mapClose = requireElement<HTMLButtonElement>('map-close');

  private readonly infoScreen = requireElement('info-screen');
  private readonly infoEyebrow = requireElement('info-eyebrow');
  private readonly infoTitle = requireElement('info-title');
  private readonly infoBody = requireElement('info-body');
  private readonly infoClose = requireElement<HTMLButtonElement>('info-close');

  constructor(private readonly callbacks: OverlayCallbacks) {
    this.startButton.addEventListener('click', () => this.callbacks.onStart());
    this.resumeButton.addEventListener('click', () => this.callbacks.onResume());
    this.mapButton.addEventListener('click', () => this.callbacks.onOpenMap());
    this.mapClose.addEventListener('click', () => this.callbacks.onCloseMap());
    this.cameraModeButton.addEventListener('click', () => this.callbacks.onToggleCamera());
    this.infoClose.addEventListener('click', () => this.callbacks.onCloseInfo());

    this.qualitySelect.addEventListener('change', () => {
      this.callbacks.onQualityChange(this.qualitySelect.value as QualityLevel);
    });
    this.sensitivityRange.addEventListener('input', () => {
      this.callbacks.onSensitivityChange(Number(this.sensitivityRange.value));
    });
    this.invertYToggle.addEventListener('change', () => {
      this.callbacks.onInvertYChange(this.invertYToggle.checked);
    });
    this.autoLevelToggle.addEventListener('change', () => {
      this.callbacks.onAutoLevelChange(this.autoLevelToggle.checked);
    });

    // The title screens use the artist's courtyard storyboard frame. Set from
    // JS so the URL picks up the GitHub Pages base path.
    document.documentElement.style.setProperty(
      '--title-bg',
      `url("${resolveAssetUrl(IMAGE_ASSETS.titleBackground.path)}")`,
    );
  }

  // ---------------------------------------------------------------- loading

  setLoadingProgress(fraction: number, message: string): void {
    const percent = Math.round(Math.max(0, Math.min(1, fraction)) * 100);
    this.loadingBarFill.style.width = `${percent}%`;
    this.loadingText.textContent = message;
  }

  showLoading(): void {
    this.loadingScreen.hidden = false;
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

  // -------------------------------------------------------------------- map

  /**
   * Shows the master plan with a "you are here" marker. The image is only
   * downloaded the first time the map is opened, so it never slows the initial
   * load.
   */
  showMap(x: number, z: number, yaw: number): void {
    if (!this.mapImage.src) {
      this.mapImage.src = resolveAssetUrl(IMAGE_ASSETS.campusMap.path);
      this.drawMapAdditions();
    }
    // World metres back to plan pixels, then to a percentage of the image.
    const px = x / PLAN.metresPerPx + PLAN.originPx[0];
    const py = z / PLAN.metresPerPx + PLAN.originPx[1];
    this.mapMarker.style.left = `${(px / PLAN.widthPx) * 100}%`;
    this.mapMarker.style.top = `${(py / PLAN.heightPx) * 100}%`;
    this.mapMarker.style.transform = `rotate(${-yaw}rad)`;
    this.mapScreen.hidden = false;
    this.mapClose.focus();
  }

  /**
   * Buildings added to the game after the master plan was drawn have no roof
   * on the plan image. Draw them over it from the layout data, outlined so it
   * is clear they are additions rather than part of the artist's drawing.
   */
  private drawMapAdditions(): void {
    const container = this.mapMarker.parentElement;
    if (!container) {
      return;
    }
    for (const building of BUILDINGS) {
      if (!ADDED_SINCE_MASTER_PLAN.includes(building.id)) {
        continue;
      }
      for (const wing of building.wings) {
        const [x0, y0, x1, y1] = wing.rect;
        const block = document.createElement('div');
        block.className = 'map-addition';
        block.style.left = `${(x0 / PLAN.widthPx) * 100}%`;
        block.style.top = `${(y0 / PLAN.heightPx) * 100}%`;
        block.style.width = `${((x1 - x0) / PLAN.widthPx) * 100}%`;
        block.style.height = `${((y1 - y0) / PLAN.heightPx) * 100}%`;
        container.insertBefore(block, this.mapMarker);
      }
      const xs = building.wings.flatMap((wing) => [wing.rect[0], wing.rect[2]]);
      const ys = building.wings.flatMap((wing) => [wing.rect[1], wing.rect[3]]);
      const label = document.createElement('span');
      label.className = 'map-addition-label';
      label.textContent = building.name;
      label.style.left = `${(((Math.min(...xs) + Math.max(...xs)) / 2) / PLAN.widthPx) * 100}%`;
      label.style.top = `${(Math.max(...ys) / PLAN.heightPx) * 100}%`;
      container.insertBefore(label, this.mapMarker);
    }
  }

  hideMap(): void {
    this.mapScreen.hidden = true;
  }

  get isMapVisible(): boolean {
    return !this.mapScreen.hidden;
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

  // --------------------------------------------------------------- settings

  /** Shows the control list matching the player's actual input device. */
  setControlScheme(touch: boolean): void {
    const hints = touch ? TOUCH_CONTROLS : DESKTOP_CONTROLS;
    renderControlsList(this.startControls, hints);
    renderControlsList(this.pauseControls, hints);
  }

  syncSettings(settings: OverlaySettings): void {
    this.qualitySelect.value = settings.quality;
    this.sensitivityRange.value = String(settings.sensitivity);
    this.invertYToggle.checked = settings.invertY;
    this.autoLevelToggle.checked = settings.autoLevel;
    this.setCameraMode(settings.cameraMode);
  }

  setCameraMode(mode: CameraMode): void {
    this.cameraModeButton.textContent = mode === 'first' ? 'View: First person' : 'View: Third person';
  }
}
