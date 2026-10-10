/**
 * Game orchestration and state machine.
 *
 * This is the only module that knows about every other one. Each subsystem —
 * engine, world, collision, interaction, input, player, UI — is independently
 * testable and replaceable; this file is the wiring between them.
 *
 * PHASES
 *   loading  — building the campus; the loading overlay is up.
 *   ready    — built, waiting for "Enter Campus" (pointer lock needs a gesture).
 *   playing  — simulating and rendering every frame.
 *   paused   — frozen; pause menu up; rendering suspended to save battery.
 *   reading  — a sign is open; frozen, but the world stays on screen behind it.
 */

import { Vector3 } from 'three';

import { CAMPUS_BOUNDS, SPAWN } from '../config/campusLayout';
import {
  MAX_FRAME_DELTA,
  QUALITY_PRESETS,
  STORAGE_KEYS,
  type QualityLevel,
} from '../config/settings';
import { InputState } from '../input/InputState';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { TouchInput } from '../input/TouchInput';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { CollisionSystem } from '../physics/CollisionSystem';
import { PlayerController } from '../player/PlayerController';
import type { GamePhase, Interactable } from '../types';
import {
  guessQualityLevel,
  isTouchPrimary,
  readStoredValue,
  writeStoredValue,
} from '../utils/device';
import { MaterialLibrary } from '../utils/MaterialLibrary';
import { Hud } from '../ui/Hud';
import { Overlays } from '../ui/Overlays';
import { buildLighting, disposeLighting, type LightingHandles } from '../world/Lighting';
import { buildWorld, disposeWorld, type BuiltWorld } from '../world/WorldBuilder';
import { resolveZoneName } from '../world/zones';
import { installDebugApi, isDebugEnabled, type CampusDebugApi } from './debug';
import { Engine } from './Engine';

/** Enough state to put the player back where they were after a rebuild. */
interface PlayerSnapshot {
  readonly x: number;
  readonly z: number;
  readonly yawDegrees: number;
}

export class Game {
  private phase: GamePhase = 'loading';

  private readonly engine: Engine;
  private readonly hud: Hud;
  private readonly overlays: Overlays;
  private readonly input = new InputState();
  private readonly keyboardMouse: KeyboardMouseInput;
  private readonly touchInput: TouchInput;

  private materials: MaterialLibrary;
  private world: BuiltWorld | null = null;
  private lighting: LightingHandles | null = null;
  private collision: CollisionSystem;
  private interaction: InteractionSystem;
  private player: PlayerController;

  private qualityLevel: QualityLevel;
  private sensitivity: number;
  private readonly touchMode: boolean;

  private frameHandle = 0;
  private lastFrameTime = 0;
  /** Set whenever the paused view needs one more frame drawn (e.g. a resize). */
  private needsRender = true;

  private currentFocus: Interactable | null = null;
  private readonly scratchPosition = new Vector3();
  private readonly scratchForward = new Vector3();

  constructor(container: HTMLElement) {
    this.touchMode = isTouchPrimary();
    this.qualityLevel = loadQualityLevel();
    this.sensitivity = loadSensitivity();

    this.engine = new Engine(
      container,
      QUALITY_PRESETS[this.qualityLevel],
      () => this.handleContextLost(),
    );

    this.hud = new Hud();
    this.overlays = new Overlays({
      onStart: () => this.handleStart(),
      onResume: () => this.resume(),
      onCloseInfo: () => this.closeInfo(),
      onQualityChange: (level) => void this.changeQuality(level),
      onSensitivityChange: (value) => this.changeSensitivity(value),
    });

    this.keyboardMouse = new KeyboardMouseInput(this.input, {
      target: container,
      onPointerLockLost: () => this.pause(),
      getSensitivity: () => this.sensitivity,
      isLookEnabled: () => this.phase === 'playing',
    });

    this.touchInput = new TouchInput(this.input, {
      joystick: this.hud.elements.joystick,
      knob: this.hud.elements.joystickKnob,
      lookSurface: this.hud.elements.lookSurface,
      interactButton: this.hud.elements.interactButton,
      getSensitivity: () => this.sensitivity,
      isLookEnabled: () => this.phase === 'playing',
    });

    // Placeholders replaced by `buildSceneContents` during `load()`. Creating
    // them here keeps every field definitely-assigned without `!` assertions.
    this.materials = new MaterialLibrary('standard');
    this.collision = new CollisionSystem([], CAMPUS_BOUNDS);
    this.interaction = new InteractionSystem([]);
    this.player = new PlayerController(this.engine.camera, this.collision);

    this.hud.setTouchMode(this.touchMode);
    this.hud.onPauseClicked(() => this.togglePause());
    this.overlays.setControlScheme(this.touchMode);
    this.overlays.syncSettings(this.qualityLevel, this.sensitivity);

    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    if (isDebugEnabled()) {
      installDebugApi(this.createDebugApi());
    }
  }

  // =========================================================== lifecycle

  /** Builds the campus, yielding to the browser so the loading bar animates. */
  async load(): Promise<void> {
    this.overlays.setLoadingProgress(0.08, 'Mixing the paint…');
    await nextFrame();

    this.buildSceneContents();

    this.overlays.setLoadingProgress(0.82, 'Compiling shaders…');
    await nextFrame();
    // Compiling up front avoids a multi-second freeze the first time a material
    // appears on screen — very noticeable on mobile GPUs.
    await this.engine.webglRenderer.compileAsync(this.engine.scene, this.engine.camera);

    this.overlays.setLoadingProgress(1, 'Ready');
    await nextFrame();

    this.phase = 'ready';
    this.overlays.hideLoading();
    this.overlays.showStart();
    this.engine.render();

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
    this.player = new PlayerController(this.engine.camera, this.collision);
    this.player.reset(SPAWN);

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
      this.engine.scene.remove(this.lighting.sky);
      this.engine.scene.remove(this.lighting.sun);
      this.engine.scene.remove(this.lighting.sun.target);
      this.engine.scene.remove(this.lighting.hemisphere);
      this.engine.scene.remove(this.lighting.ambient);
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
    // Clamp so a long stall (a backgrounded tab, a garbage-collection pause)
    // cannot teleport the player through a wall.
    const delta = Math.min(Math.max(rawDelta, 0), MAX_FRAME_DELTA);

    // Pause and interact are polled in every phase, so Esc still works from the
    // pause menu and from an open sign.
    if (this.input.consumePause()) {
      this.togglePause();
    }
    if (this.input.consumeInteract()) {
      this.handleInteract();
    }

    if (this.phase === 'playing') {
      this.update(delta);
      this.engine.render();
      return;
    }

    if (this.needsRender) {
      this.needsRender = false;
      this.engine.render();
    }
  };

  private update(delta: number): void {
    this.player.update(delta, this.input.readMovement(), this.input.takeLook());

    this.player.getPosition(this.scratchPosition);
    this.player.getFlatForward(this.scratchForward);

    this.hud.setZoneName(resolveZoneName(this.scratchPosition.x, this.scratchPosition.z));

    const focus = this.interaction.findFocus(this.scratchPosition, this.scratchForward);
    if (focus !== this.currentFocus) {
      this.currentFocus = focus;
      this.hud.setFocus(focus, this.touchMode);
      if (this.touchMode) {
        this.touchInput.setInteractAvailable(focus !== null);
      }
    }
  }

  // =============================================================== phases

  private handleStart(): void {
    this.overlays.hideStart();
    this.hud.setVisible(true);
    this.enterPlaying();
  }

  private enterPlaying(): void {
    this.phase = 'playing';
    this.input.clear();
    // Mouse look needs pointer lock; touch does not, and asking for it on a
    // phone pops a permission-looking prompt for no benefit.
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
    this.overlays.hidePause();
    this.enterPlaying();
  }

  private togglePause(): void {
    switch (this.phase) {
      case 'playing':
        this.pause();
        break;
      case 'paused':
        this.resume();
        break;
      case 'reading':
        this.closeInfo();
        break;
      case 'loading':
      case 'ready':
        break;
    }
  }

  private handleInteract(): void {
    if (this.phase === 'reading') {
      this.closeInfo();
      return;
    }
    if (this.phase === 'ready') {
      // Pressing E on the start screen is a fair way to say "let me in".
      this.handleStart();
      return;
    }
    if (this.phase !== 'playing' || !this.currentFocus) {
      return;
    }

    this.phase = 'reading';
    this.input.clear();
    // Release the lock so the player can actually click "Close". Releasing it
    // through this method marks it intentional, so it does not trigger a pause.
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
    this.qualityLevel = level;
    writeStoredValue(STORAGE_KEYS.quality, level);

    const snapshot = this.snapshotPlayer();
    const quality = QUALITY_PRESETS[level];

    this.overlays.setLoadingProgress(0.1, 'Rebuilding the campus…');
    this.teardownSceneContents();
    this.engine.applyQuality(quality);
    await nextFrame();

    this.buildSceneContents();
    this.restorePlayer(snapshot);

    await this.engine.webglRenderer.compileAsync(this.engine.scene, this.engine.camera);
    this.needsRender = true;
    this.engine.render();
  }

  private changeSensitivity(value: number): void {
    this.sensitivity = value;
    writeStoredValue(STORAGE_KEYS.sensitivity, String(value));
  }

  private snapshotPlayer(): PlayerSnapshot {
    this.player.getPosition(this.scratchPosition);
    this.player.getFlatForward(this.scratchForward);
    return {
      x: this.scratchPosition.x,
      z: this.scratchPosition.z,
      // Invert `getFlatForward`: forward = (-sin yaw, 0, -cos yaw).
      yawDegrees: (Math.atan2(-this.scratchForward.x, -this.scratchForward.z) * 180) / Math.PI,
    };
  }

  private restorePlayer(snapshot: PlayerSnapshot): void {
    this.player.reset({
      position: [snapshot.x, snapshot.z],
      yawDegrees: snapshot.yawDegrees,
    });
  }

  // ============================================================== browser

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause();
    }
  };

  private createDebugApi(): CampusDebugApi {
    return {
      getPlayer: () => {
        const snapshot = this.snapshotPlayer();
        return { ...snapshot, speed: this.player.speed };
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
      getZoneName: () => {
        this.player.getPosition(this.scratchPosition);
        return resolveZoneName(this.scratchPosition.x, this.scratchPosition.z);
      },
      teleport: (x, z, yawDegrees) => {
        const current = this.snapshotPlayer();
        this.player.reset({
          position: [x, z],
          yawDegrees: yawDegrees ?? current.yawDegrees,
        });
        this.needsRender = true;
      },
    };
  }

  private handleContextLost(): void {
    this.pause();
    this.overlays.showFatalError(
      'The graphics context was lost — usually because the browser reclaimed ' +
        'memory. Please reload the page to continue.',
    );
  }
}

/** Resolves on the next animation frame, so the browser can paint. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function loadQualityLevel(): QualityLevel {
  const stored = readStoredValue(STORAGE_KEYS.quality);
  if (stored === 'low' || stored === 'medium' || stored === 'high') {
    return stored;
  }
  return guessQualityLevel();
}

function loadSensitivity(): number {
  const stored = Number(readStoredValue(STORAGE_KEYS.sensitivity));
  if (Number.isFinite(stored) && stored >= 0.3 && stored <= 2.5) {
    return stored;
  }
  return 1;
}
