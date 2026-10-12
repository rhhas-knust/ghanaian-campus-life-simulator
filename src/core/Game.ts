/**
 * Game orchestration and state machine.
 *
 * This is the only module that knows about every other one. Engine, world,
 * collision, interaction, input, player, camera and UI are each independently
 * replaceable; this file is the wiring between them.
 *
 * PHASES
 *   loading  — building the campus; the loading overlay is up.
 *   ready    — built, waiting for "Enter Campus" (pointer lock and fullscreen
 *              both need a user gesture).
 *   playing  — simulating and rendering every frame.
 *   paused   — frozen; pause menu (and possibly the campus map) up; rendering
 *              suspended to save battery.
 *   reading  — a sign is open; frozen, with the world still visible behind it.
 */

import { Vector3 } from 'three';

import { CAMPUS_BOUNDS, SPAWN } from '../config/campusLayout';
import {
  MAX_FRAME_DELTA,
  QUALITY_PRESETS,
  STORAGE_KEYS,
  type CameraMode,
  type QualityLevel,
} from '../config/settings';
import { InputState } from '../input/InputState';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { TouchInput } from '../input/TouchInput';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { CollisionSystem } from '../physics/CollisionSystem';
import { Avatar } from '../player/Avatar';
import { CameraRig } from '../player/CameraRig';
import { PlayerController } from '../player/PlayerController';
import type { GamePhase, Interactable } from '../types';
import { guessQualityLevel, isTouchPrimary, readStoredValue, writeStoredValue } from '../utils/device';
import { MaterialLibrary } from '../utils/MaterialLibrary';
import { Hud } from '../ui/Hud';
import { Overlays } from '../ui/Overlays';
import {
  buildLighting,
  disposeLighting,
  updateShadowFocus,
  type LightingHandles,
} from '../world/Lighting';
import { buildWorld, disposeWorld, type BuiltWorld } from '../world/WorldBuilder';
import { resolveZoneName } from '../world/zones';
import { installDebugApi, isDebugEnabled, type CampusDebugApi } from './debug';
import { Engine } from './Engine';

/** Enough state to put the player back where they were after a rebuild. */
interface PlayerSnapshot {
  readonly x: number;
  readonly z: number;
  readonly yawDegrees: number;
  readonly pitch: number;
}

/** Seconds the "swipe to look" hint stays up if the player never swipes. */
const LOOK_HINT_SECONDS = 8;

export class Game {
  private phase: GamePhase = 'loading';

  private readonly engine: Engine;
  private readonly hud: Hud;
  private readonly overlays: Overlays;
  private readonly input = new InputState();
  private readonly keyboardMouse: KeyboardMouseInput;
  private readonly touchInput: TouchInput;
  private readonly avatar: Avatar;

  private materials: MaterialLibrary;
  private world: BuiltWorld | null = null;
  private lighting: LightingHandles | null = null;
  private collision: CollisionSystem;
  private interaction: InteractionSystem;
  private player: PlayerController;
  private cameraRig: CameraRig;

  private qualityLevel: QualityLevel;
  private sensitivity: number;
  private invertY: boolean;
  private autoLevel: boolean;
  private cameraMode: CameraMode;
  private readonly touchMode: boolean;

  private frameHandle = 0;
  private lastFrameTime = 0;
  /** Set whenever the paused view needs one more frame drawn (e.g. a resize). */
  private needsRender = true;
  private lookHintSeconds = 0;
  private hasLooked = false;

  private currentFocus: Interactable | null = null;
  private readonly scratchForward = new Vector3();

  constructor(container: HTMLElement) {
    this.touchMode = isTouchPrimary();
    this.qualityLevel = loadQualityLevel();
    this.sensitivity = loadNumber(STORAGE_KEYS.sensitivity, 1, 0.3, 2.5);
    this.invertY = readStoredValue(STORAGE_KEYS.invertY) === 'true';
    // Auto-level defaults on for touch, where the drift problem lives.
    const storedAutoLevel = readStoredValue(STORAGE_KEYS.autoLevel);
    this.autoLevel = storedAutoLevel === null ? this.touchMode : storedAutoLevel === 'true';
    this.cameraMode = readStoredValue(STORAGE_KEYS.cameraMode) === 'third' ? 'third' : 'first';

    this.engine = new Engine(container, QUALITY_PRESETS[this.qualityLevel], () => this.handleContextLost());
    this.avatar = new Avatar(this.engine.scene);

    this.hud = new Hud();
    this.overlays = new Overlays({
      onStart: () => this.handleStart(),
      onResume: () => this.resume(),
      onCloseInfo: () => this.closeInfo(),
      onOpenMap: () => this.openMap(),
      onCloseMap: () => this.closeMap(),
      onToggleCamera: () => this.toggleCamera(),
      onQualityChange: (level) => void this.changeQuality(level),
      onSensitivityChange: (value) => {
        this.sensitivity = value;
        writeStoredValue(STORAGE_KEYS.sensitivity, String(value));
      },
      onInvertYChange: (inverted) => {
        this.invertY = inverted;
        writeStoredValue(STORAGE_KEYS.invertY, String(inverted));
      },
      onAutoLevelChange: (enabled) => {
        this.autoLevel = enabled;
        writeStoredValue(STORAGE_KEYS.autoLevel, String(enabled));
      },
    });

    this.keyboardMouse = new KeyboardMouseInput(this.input, {
      target: container,
      onPointerLockLost: () => this.pause(),
      getSensitivity: () => this.sensitivity,
      isLookEnabled: () => this.phase === 'playing',
      isInvertY: () => this.invertY,
    });

    this.touchInput = new TouchInput(this.input, {
      joystick: this.hud.elements.joystick,
      knob: this.hud.elements.joystickKnob,
      lookSurface: this.hud.elements.lookSurface,
      interactButton: this.hud.elements.interactButton,
      getSensitivity: () => this.sensitivity,
      isLookEnabled: () => this.phase === 'playing',
      isInvertY: () => this.invertY,
    });

    // Placeholders replaced by `buildSceneContents` during `load()`. Creating
    // them here keeps every field definitely assigned without `!` assertions.
    this.materials = new MaterialLibrary('standard');
    this.collision = new CollisionSystem([], CAMPUS_BOUNDS);
    this.interaction = new InteractionSystem([]);
    this.player = new PlayerController(this.collision);
    this.cameraRig = new CameraRig(this.engine.camera, this.collision);

    this.hud.setTouchMode(this.touchMode);
    this.hud.setCameraMode(this.cameraMode);
    this.hud.onPauseClicked(() => this.togglePause());
    this.hud.onCameraClicked(() => this.toggleCamera());
    this.overlays.setControlScheme(this.touchMode);
    this.overlays.syncSettings({
      quality: this.qualityLevel,
      sensitivity: this.sensitivity,
      invertY: this.invertY,
      autoLevel: this.autoLevel,
      cameraMode: this.cameraMode,
    });

    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    if (isDebugEnabled()) {
      installDebugApi(this.createDebugApi());
    }
  }

  // =========================================================== lifecycle

  /** Builds the campus, yielding to the browser so the loading bar animates. */
  async load(): Promise<void> {
    this.overlays.setLoadingProgress(0.08, 'Laying out the campus…');
    await nextFrame();

    this.buildSceneContents();
    this.player.reset(SPAWN);
    this.applyCameraMode(this.cameraMode);

    this.overlays.setLoadingProgress(0.8, 'Preparing the graphics…');
    await nextFrame();
    // Compiling up front avoids a multi-second freeze the first time a
    // material appears on screen — very noticeable on mobile GPUs.
    await this.engine.webglRenderer.compileAsync(this.engine.scene, this.engine.camera);

    this.overlays.setLoadingProgress(1, 'Ready');
    await nextFrame();

    this.phase = 'ready';
    this.overlays.hideLoading();
    this.overlays.showStart();
    this.renderFrame(0);

    this.keyboardMouse.attach();
    if (this.touchMode) {
      this.touchInput.attach();
    }

    this.lastFrameTime = performance.now();
    this.frameHandle = requestAnimationFrame(this.loop);
  }

  dispose(): void {
    if (this.frameHandle !== 0) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = 0;
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.keyboardMouse.detach();
    this.touchInput.detach();
    this.teardownSceneContents();
    this.avatar.dispose();
    this.engine.dispose();
  }

  // ======================================================= scene contents

  private buildSceneContents(): void {
    const quality = QUALITY_PRESETS[this.qualityLevel];
    this.materials = new MaterialLibrary(this.qualityLevel === 'low' ? 'lambert' : 'standard');

    const world = buildWorld(quality, this.materials);
    this.engine.scene.add(world.group);
    this.world = world;
    this.lighting = buildLighting(this.engine.scene, quality);

    this.collision = new CollisionSystem(world.colliders, CAMPUS_BOUNDS);
    this.interaction = new InteractionSystem(world.interactables);
    this.player = new PlayerController(this.collision);
    this.cameraRig = new CameraRig(this.engine.camera, this.collision);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(
        `[campus] ${world.stats.batches} draw batches from ${world.stats.submissions} pieces, ` +
          `~${world.stats.triangles.toLocaleString()} triangles, ` +
          `${world.colliders.length} colliders, ${world.interactables.length} interactables`,
      );
    }
  }

  private teardownSceneContents(): void {
    if (this.world) {
      this.engine.scene.remove(this.world.group);
      disposeWorld(this.world);
      this.world = null;
    }
    if (this.lighting) {
      const { sky, sun, hemisphere, ambient } = this.lighting;
      this.engine.scene.remove(sky, sun, sun.target, hemisphere, ambient);
      disposeLighting(this.lighting);
      this.lighting = null;
    }
    this.materials.dispose();
    this.engine.scene.fog = null;
  }

  // ============================================================ main loop

  private readonly loop = (timestamp: number): void => {
    this.frameHandle = requestAnimationFrame(this.loop);

    const rawDelta = (timestamp - this.lastFrameTime) / 1000;
    this.lastFrameTime = timestamp;
    // Clamp so a stall (backgrounded tab, garbage collection) cannot teleport
    // the player through a wall.
    const delta = Math.min(Math.max(rawDelta, 0), MAX_FRAME_DELTA);

    // Polled in every phase, so Esc still works from the pause menu, the map
    // and an open sign.
    if (this.input.consumePause()) {
      this.handleBack();
    }
    if (this.input.consumeInteract()) {
      this.handleInteract();
    }
    if (this.input.consumeCameraToggle() && (this.phase === 'playing' || this.phase === 'paused')) {
      this.toggleCamera();
    }

    if (this.phase === 'playing') {
      this.update(delta);
      this.renderFrame(delta);
      return;
    }
    if (this.needsRender) {
      this.needsRender = false;
      this.renderFrame(0);
    }
  };

  private update(delta: number): void {
    const look = this.input.takeLook();
    if (Math.abs(look.yaw) + Math.abs(look.pitch) > 1e-5) {
      this.hasLooked = true;
    }
    this.player.update(delta, this.input.readMovement(), look, { autoLevel: this.autoLevel });

    const { x, z } = this.player.position;
    this.hud.setZoneName(resolveZoneName(x, z));
    this.hud.updateMinimap(x, z, this.player.yaw);

    if (this.touchMode) {
      this.lookHintSeconds += delta;
      this.hud.setLookHintVisible(!this.hasLooked && this.lookHintSeconds < LOOK_HINT_SECONDS);
    }

    this.player.getFlatForward(this.scratchForward);
    const focus = this.interaction.findFocus(this.player.position, this.scratchForward);
    if (focus !== this.currentFocus) {
      this.currentFocus = focus;
      this.hud.setFocus(focus, this.touchMode);
      if (this.touchMode) {
        this.touchInput.setInteractAvailable(focus !== null);
      }
    }
  }

  /** Places the camera, keeps the sky and shadows centred on it, and draws. */
  private renderFrame(delta: number): void {
    this.cameraRig.update(delta, this.player);
    if (this.cameraMode === 'third') {
      this.avatar.update(delta, this.player);
    }
    if (this.lighting) {
      // The sky dome must travel with the camera. Centred on the world origin,
      // its far side drops beyond the camera's far plane on a campus this big
      // and renders as a black wedge in the sky.
      this.lighting.sky.position.copy(this.engine.camera.position);
      updateShadowFocus(this.lighting, QUALITY_PRESETS[this.qualityLevel], this.player.position.x, this.player.position.z);
    }
    this.engine.render();
  }

  // =============================================================== camera

  private toggleCamera(): void {
    this.applyCameraMode(this.cameraMode === 'first' ? 'third' : 'first');
    writeStoredValue(STORAGE_KEYS.cameraMode, this.cameraMode);
    this.needsRender = true;
  }

  private applyCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.cameraRig.setMode(mode);
    this.avatar.setVisible(mode === 'third');
    // Snap the avatar into place so it does not slide in from the origin.
    this.avatar.update(1, this.player);
    this.hud.setCameraMode(mode);
    this.overlays.setCameraMode(mode);
  }

  // =============================================================== phases

  private handleStart(): void {
    this.overlays.hideStart();
    this.hud.setVisible(true);
    this.hud.updateMinimap(this.player.position.x, this.player.position.z, this.player.yaw, true);
    if (this.touchMode) {
      void enterFullscreenLandscape();
    }
    this.enterPlaying();
  }

  private enterPlaying(): void {
    this.phase = 'playing';
    this.input.clear();
    this.cameraRig.snap();
    // Mouse look needs pointer lock; touch does not, and asking for it on a
    // phone only produces a confusing prompt.
    if (!this.touchMode) {
      this.keyboardMouse.requestPointerLock();
    }
  }

  private pause(): void {
    if (this.phase !== 'playing') {
      return;
    }
    this.phase = 'paused';
    this.input.clear();
    this.hud.setFocus(null, this.touchMode);
    this.currentFocus = null;
    if (!this.touchMode) {
      this.keyboardMouse.releasePointerLock();
    }
    this.overlays.showPause();
    this.needsRender = true;
  }

  private resume(): void {
    if (this.phase !== 'paused') {
      return;
    }
    this.overlays.hideMap();
    this.overlays.hidePause();
    this.enterPlaying();
  }

  private togglePause(): void {
    if (this.phase === 'playing') {
      this.pause();
    } else if (this.phase === 'paused') {
      this.resume();
    } else if (this.phase === 'reading') {
      this.closeInfo();
    }
  }

  /** Esc / P / the pause button: close the innermost thing that is open. */
  private handleBack(): void {
    if (this.overlays.isMapVisible) {
      this.closeMap();
      return;
    }
    this.togglePause();
  }

  private openMap(): void {
    this.overlays.showMap(this.player.position.x, this.player.position.z, this.player.yaw);
  }

  private closeMap(): void {
    this.overlays.hideMap();
  }

  private handleInteract(): void {
    if (this.phase === 'reading') {
      this.closeInfo();
      return;
    }
    if (this.phase === 'ready') {
      this.handleStart();
      return;
    }
    if (this.phase !== 'playing' || !this.currentFocus) {
      return;
    }
    this.phase = 'reading';
    this.input.clear();
    // Release the lock so the player can click "Close". Releasing it through
    // this method marks it intentional, so it does not also pause the game.
    if (!this.touchMode) {
      this.keyboardMouse.releasePointerLock();
    }
    this.overlays.showInfo(this.currentFocus);
    this.needsRender = true;
  }

  private closeInfo(): void {
    if (this.phase !== 'reading') {
      return;
    }
    this.overlays.hideInfo();
    this.enterPlaying();
  }

  // ============================================================= settings

  private async changeQuality(level: QualityLevel): Promise<void> {
    if (level === this.qualityLevel) {
      return;
    }
    const snapshot = this.snapshotPlayer();
    this.qualityLevel = level;
    writeStoredValue(STORAGE_KEYS.quality, level);

    this.overlays.showLoading();
    this.overlays.setLoadingProgress(0.2, 'Rebuilding the campus…');
    await nextFrame();
    this.teardownSceneContents();
    this.engine.applyQuality(QUALITY_PRESETS[level]);
    this.buildSceneContents();
    this.restorePlayer(snapshot);
    this.applyCameraMode(this.cameraMode);

    this.overlays.setLoadingProgress(0.8, 'Preparing the graphics…');
    await nextFrame();
    await this.engine.webglRenderer.compileAsync(this.engine.scene, this.engine.camera);
    this.overlays.hideLoading();
    this.needsRender = true;
  }

  private snapshotPlayer(): PlayerSnapshot {
    return {
      x: this.player.position.x,
      z: this.player.position.z,
      yawDegrees: (this.player.yaw * 180) / Math.PI,
      pitch: this.player.pitch,
    };
  }

  private restorePlayer(snapshot: PlayerSnapshot): void {
    this.player.reset({ position: [snapshot.x, snapshot.z], yawDegrees: snapshot.yawDegrees }, snapshot.pitch);
    this.cameraRig.snap();
  }

  // ============================================================== browser

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause();
    }
  };

  private handleContextLost(): void {
    this.pause();
    this.overlays.showFatalError(
      'The graphics context was lost — usually because the browser reclaimed memory. ' +
        'Please reload the page to continue.',
    );
  }

  private createDebugApi(): CampusDebugApi {
    return {
      getPlayer: () => {
        const snapshot = this.snapshotPlayer();
        return { x: snapshot.x, z: snapshot.z, yawDegrees: snapshot.yawDegrees, pitch: snapshot.pitch, speed: this.player.speed };
      },
      getCamera: () => {
        const position = this.engine.camera.position;
        return { mode: this.cameraMode, x: position.x, y: position.y, z: position.z };
      },
      getStats: () => ({
        batches: this.world?.stats.batches ?? 0,
        submissions: this.world?.stats.submissions ?? 0,
        triangles: this.world?.stats.triangles ?? 0,
        colliders: this.collision.colliderCount,
        interactables: this.interaction.count,
      }),
      getPhase: () => this.phase,
      getFocusId: () => this.currentFocus?.id ?? null,
      getZoneName: () => resolveZoneName(this.player.position.x, this.player.position.z),
      teleport: (x, z, yawDegrees) => {
        const current = this.snapshotPlayer();
        this.player.reset({ position: [x, z], yawDegrees: yawDegrees ?? current.yawDegrees });
        this.cameraRig.snap();
        this.needsRender = true;
      },
    };
  }
}

/** Resolves on the next animation frame, so the browser can paint. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/**
 * On a phone: go fullscreen (no address bar eating the view or sliding in and
 * out mid-swipe) and lock to landscape where the browser allows it. Both need a
 * user gesture and both may be refused — that is fine, the game works either way.
 */
async function enterFullscreenLandscape(): Promise<void> {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    await orientation.lock?.('landscape');
  } catch {
    // Refused (desktop browser, iOS, or the user said no). Carry on.
  }
}

function loadQualityLevel(): QualityLevel {
  const stored = readStoredValue(STORAGE_KEYS.quality);
  if (stored === 'low' || stored === 'medium' || stored === 'high') {
    return stored;
  }
  return guessQualityLevel();
}

function loadNumber(key: string, fallback: number, min: number, max: number): number {
  const stored = Number(readStoredValue(key));
  return Number.isFinite(stored) && stored >= min && stored <= max && readStoredValue(key) !== null ? stored : fallback;
}
