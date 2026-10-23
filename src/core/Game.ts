/**
 * Game orchestration and state machine.
 *
 * This is the only module that knows about every other one. Engine, world,
 * collision, interaction, input, player, camera and UI are each independently
 * replaceable; this file is the wiring between them.
 *
 * PHASES
 *   loading   — building the campus; the loading overlay is up.
 *   ready     — built, waiting for "New Story" / "Continue Story" (pointer
 *               lock and fullscreen both need a user gesture).
 *   cinematic — the arrival cinematic is flying the camera over the campus.
 *   creating  — character creation is up.
 *   playing   — simulating and rendering every frame.
 *   paused    — frozen; pause menu (and possibly the campus map) up; rendering
 *               suspended to save battery.
 *   reading   — a sign or story card is open; frozen, world visible behind it.
 *   transition — fading between the campus and an interior.
 *   dialogue  — a conversation is on screen; frozen.
 *   phone     — the phone is open; frozen.
 *
 * LOCATIONS
 *   The player is on the campus or inside one interior. Going in hides the
 *   campus, builds the interior, swaps the colliders and interactables, and
 *   switches the lighting and minimap; coming out disposes the interior. Only
 *   one interior exists at a time, and the player, camera rig and collision
 *   system objects are never replaced — they just get a different world.
 *
 * THE STORY
 *   The story layer (`src/story/`) is plain data and logic: flags, the
 *   dialogue runner, the mission director, the save. This class is where it
 *   meets the world — an interaction becomes a conversation or a flag, and
 *   every story change is pushed out to the HUD, the beacon and the save.
 */

import { Vector3 } from 'three';

import { CAMPUS_BOUNDS, SPAWN, planPoint } from '../config/campusLayout';
import {
  ENTRANCES,
  INTERIORS,
  findEntrance,
  locationPoint,
  roomAt,
  type LocationId,
} from '../config/interiors';
import {
  MAX_FRAME_DELTA,
  QUALITY_PRESETS,
  STORAGE_KEYS,
  type CameraMode,
  type QualityLevel,
} from '../config/settings';
import { NpcFigures } from '../actors/NpcFigures';
import { ObjectiveBeacon } from '../actors/ObjectiveBeacon';
import { buildStoryPlacements, openingFigures } from '../actors/storyPlacements';
import { InputState } from '../input/InputState';
import { KeyboardMouseInput } from '../input/KeyboardMouseInput';
import { TouchInput } from '../input/TouchInput';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { CollisionSystem } from '../physics/CollisionSystem';
import { Avatar } from '../player/Avatar';
import { CameraRig } from '../player/CameraRig';
import { CinematicCamera } from '../player/CinematicCamera';
import { PlayerController } from '../player/PlayerController';
import type { CampusBounds, GamePhase, Interactable, Vec2Tuple } from '../types';
import { guessQualityLevel, isTouchPrimary, readStoredValue, writeStoredValue } from '../utils/device';
import { MaterialLibrary } from '../utils/MaterialLibrary';
import { CAST, findCastMember } from '../story/data/cast';
import { FIRST_MISSION_ID, type MissionDef } from '../story/data/missions';
import { OPENING_SHOTS } from '../story/data/opening';
import { FIRST_NIGHT_CARD, ORDINARY_NIGHT_CARD, STORY_PLACES, WAKE_SPOT } from '../story/data/places';
import { DIALOGUES, DialogueRunner } from '../story/dialogue';
import { MESSAGE_THREADS, hasUnreadThread, visibleThreads } from '../story/messages';
import { deleteSavedStory, loadStory, saveStory } from '../story/save';
import { StoryDirector, type Objective } from '../story/StoryDirector';
import { StoryState, formatClock } from '../story/StoryState';
import {
  ADDRESS_LABELS,
  HOMES,
  PROGRAMMES,
  REPUTATION_LABELS,
  type PlayerProfile,
  type ReputationAxis,
} from '../story/types';
import { CharacterCreation } from '../ui/CharacterCreation';
import { CinematicOverlay } from '../ui/CinematicOverlay';
import { DialogueBox, type DialogueSpeaker } from '../ui/DialogueBox';
import { Hud } from '../ui/Hud';
import { Overlays, type InfoContent } from '../ui/Overlays';
import { PhoneMenu, type PhoneTab, type PhoneView } from '../ui/PhoneMenu';
import { buildInterior, disposeInterior, type BuiltInterior } from '../world/interiors/InteriorBuilder';
import {
  buildLighting,
  disposeLighting,
  setIndoorLighting,
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

const PLAYER_ACCENT = '#2f9a4f';

export class Game {
  private phase: GamePhase = 'loading';

  private readonly engine: Engine;
  private readonly hud: Hud;
  private readonly overlays: Overlays;
  private readonly input = new InputState();
  private readonly keyboardMouse: KeyboardMouseInput;
  private readonly touchInput: TouchInput;
  private readonly avatar: Avatar;
  private readonly npcs: NpcFigures;
  private readonly beacon: ObjectiveBeacon;
  private readonly cinematicCamera: CinematicCamera;
  private readonly cinematicOverlay: CinematicOverlay;
  private readonly creation: CharacterCreation;
  private readonly dialogueBox: DialogueBox;
  private readonly phone: PhoneMenu;
  private story: StoryState | null = null;
  private director: StoryDirector | null = null;
  private conversation: { readonly runner: DialogueRunner; readonly who: string } | null = null;
  /** The current objective, cached when the story changes rather than worked out every frame. */
  private objective: Objective | null = null;
  /** Story cards waiting to be shown, e.g. a mission-complete card after its last conversation. */
  private readonly pendingCards: InfoContent[] = [];

  private location: LocationId = 'campus';
  private interior: BuiltInterior | null = null;
  /** Identifies the characters and story interactables currently placed, to skip identical rebuilds. */
  private placementSignature = '';
  /** Where the objective marker points right now, in the current location's metres. */
  private guidance: Vec2Tuple | null = null;

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
    this.npcs = new NpcFigures(this.engine.scene, CAST);
    this.beacon = new ObjectiveBeacon(this.engine.scene);
    this.cinematicCamera = new CinematicCamera(this.engine.camera);

    this.cinematicOverlay = new CinematicOverlay(() => this.finishCinematic());
    this.creation = new CharacterCreation((profile) => this.handleCreation(profile));
    this.dialogueBox = new DialogueBox({
      onAdvance: () => this.advanceDialogue(),
      onChoose: (index) => this.chooseDialogue(index),
    });
    this.phone = new PhoneMenu({
      onClose: () => this.closePhone(),
      onOpenMap: () => this.openMap(),
      onOpenThread: (id) => this.handleThreadOpened(id),
    });

    this.hud = new Hud();
    this.overlays = new Overlays({
      onStart: () => this.handleStart(),
      onNewStory: () => {
        deleteSavedStory();
        this.handleStart();
      },
      onRestartStory: () => {
        // A clean reload is the simplest way to put every system back to the
        // state a new player sees.
        deleteSavedStory();
        window.location.reload();
      },
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
    this.hud.onPhoneClicked(() => this.togglePhone());
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
    this.overlays.showStart(loadStory() !== null);
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
    this.npcs.dispose();
    this.beacon.dispose();
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

    // Rebuilds the current interior too, if the player is inside one.
    this.applyLocationContents();

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
    if (this.interior) {
      disposeInterior(this.interior);
      this.interior = null;
    }
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

  /**
   * Makes the scene match `this.location`: the campus visible, or the
   * campus hidden and the interior built. Also swaps lighting, the minimap
   * plan and the camera's ceiling, then re-places the story's characters.
   */
  private applyLocationContents(): void {
    const world = this.world;
    const lighting = this.lighting;
    if (!world || !lighting) {
      return;
    }
    const quality = QUALITY_PRESETS[this.qualityLevel];
    if (this.location === 'campus') {
      if (this.interior) {
        disposeInterior(this.interior);
        this.interior = null;
      }
      world.group.visible = true;
      setIndoorLighting(lighting, this.engine.scene, false, quality);
      this.hud.setInterior(null);
      this.cameraRig.setCeiling(null);
    } else {
      const def = INTERIORS[this.location];
      if (this.interior?.def.id !== def.id) {
        if (this.interior) {
          disposeInterior(this.interior);
        }
        this.interior = buildInterior(def, quality, this.materials);
        this.engine.scene.add(this.interior.group);
      }
      world.group.visible = false;
      setIndoorLighting(lighting, this.engine.scene, true, quality);
      this.hud.setInterior(def);
      this.cameraRig.setCeiling(def.wallHeight);
    }
    this.placementSignature = '';
    this.refreshPlacements();
  }

  /**
   * Puts the story's characters, places and doors into the collision and
   * interaction systems for the current location and story state. Cheap to
   * call: nothing is rebuilt unless what should be here has changed.
   */
  private refreshPlacements(): void {
    const base = this.location === 'campus' ? this.world : this.interior;
    if (!base) {
      return;
    }
    const placements = this.story ? buildStoryPlacements(this.location, this.story) : null;
    const signature = placements?.signature ?? `none:${this.location}`;
    if (signature === this.placementSignature) {
      return;
    }
    this.placementSignature = signature;
    this.collision.replace([...base.colliders, ...(placements?.colliders ?? [])], this.currentBounds());
    this.interaction.replace([...base.interactables, ...(placements?.interactables ?? [])]);
    if (this.phase !== 'cinematic') {
      this.npcs.arrange(placements?.figures ?? []);
    }
    // Whatever was in focus may be gone; the next frame picks again.
    this.currentFocus = null;
    this.hud.setFocus(null, this.touchMode);
  }

  private currentBounds(): CampusBounds {
    if (this.location === 'campus') {
      return CAMPUS_BOUNDS;
    }
    const [minX, minZ, maxX, maxZ] = INTERIORS[this.location].bounds;
    return { minX, maxX, minZ, maxZ };
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
    if (this.input.consumePhone()) {
      this.togglePhone();
    }
    if (this.input.consumeCameraToggle() && (this.phase === 'playing' || this.phase === 'paused')) {
      this.toggleCamera();
    }

    if (this.phase === 'playing') {
      this.update(delta);
      this.renderFrame(delta);
      return;
    }
    if (this.phase === 'cinematic') {
      this.updateCinematic(delta);
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

    this.story?.advanceClock(delta);

    const { x, z } = this.player.position;
    this.updateGuidance();
    this.beacon.update(delta, x, z);
    this.hud.setZoneName(this.interior ? (roomAt(this.interior.def, x, z)?.name ?? this.interior.def.name) : resolveZoneName(x, z));
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
    // Shadows only cover a patch of the campus, so keep that patch on whatever
    // is in shot: the player, or what the cinematic camera is looking at.
    let focusX = this.player.position.x;
    let focusZ = this.player.position.z;
    if (this.phase === 'cinematic') {
      this.cinematicCamera.apply();
      focusX = this.cinematicCamera.focus.x;
      focusZ = this.cinematicCamera.focus.z;
    } else {
      this.cameraRig.update(delta, this.player);
      if (this.cameraMode === 'third') {
        this.avatar.update(delta, this.player);
      }
    }
    if (this.lighting) {
      // The sky dome must travel with the camera. Centred on the world origin,
      // its far side drops beyond the camera's far plane on a campus this big
      // and renders as a black wedge in the sky.
      this.lighting.sky.position.copy(this.engine.camera.position);
      updateShadowFocus(this.lighting, QUALITY_PRESETS[this.qualityLevel], focusX, focusZ);
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

  /** "New Story" or "Continue Story" on the title screen. */
  private handleStart(): void {
    if (this.phase !== 'ready') {
      return;
    }
    this.overlays.hideStart();
    if (this.touchMode) {
      void enterFullscreenLandscape();
    }
    const saved = loadStory();
    if (saved) {
      this.continueStory(saved);
    } else {
      this.startCinematic();
    }
  }

  private startCinematic(): void {
    this.phase = 'cinematic';
    this.input.clear();
    this.player.reset(SPAWN);
    this.avatar.setVisible(false);
    if (this.location !== 'campus') {
      this.location = 'campus';
      this.applyLocationContents();
    }
    this.npcs.arrange(openingFigures());
    this.beacon.setTarget(null);
    this.cinematicCamera.start(OPENING_SHOTS);
    this.cinematicOverlay.show();
    this.showCurrentShot();
  }

  private updateCinematic(delta: number): void {
    if (this.cinematicCamera.update(delta)) {
      this.showCurrentShot();
    }
    if (this.cinematicCamera.finished) {
      this.finishCinematic();
    }
  }

  private showCurrentShot(): void {
    const shot = this.cinematicCamera.currentShot;
    if (shot) {
      this.cinematicOverlay.showShot(shot.style, shot.text);
    }
  }

  /** The end of the cinematic, or the Skip button: on to character creation. */
  private finishCinematic(): void {
    if (this.phase !== 'cinematic') {
      return;
    }
    this.cinematicOverlay.hide();
    this.npcs.arrange([]);
    this.applyCameraMode(this.cameraMode);
    this.cameraRig.snap();
    this.phase = 'creating';
    this.creation.show();
    this.needsRender = true;
  }

  private handleCreation(profile: PlayerProfile): void {
    if (this.phase !== 'creating') {
      return;
    }
    this.creation.hide();
    this.story = new StoryState(profile, FIRST_MISSION_ID);
    this.director = new StoryDirector(this.story);
    this.player.reset(SPAWN);
    this.placementSignature = '';
    this.persistStory();
    this.beginPlay();
  }

  private continueStory(saved: StoryState): void {
    this.story = saved;
    this.director = new StoryDirector(saved);
    // Back where they saved: on campus, or inside the room they were in.
    this.location = saved.position?.location ?? 'campus';
    this.applyLocationContents();
    if (saved.position) {
      this.player.reset({ position: [saved.position.x, saved.position.z], yawDegrees: saved.position.yawDegrees });
    } else {
      this.player.reset(SPAWN);
    }
    this.beginPlay();
  }

  private beginPlay(): void {
    this.hud.setVisible(true);
    this.hud.updateMinimap(this.player.position.x, this.player.position.z, this.player.yaw, true);
    this.onStoryChanged(false);
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
    // Pausing is also when the tab gets hidden or the phone locks, so it is the
    // moment to remember where the player is standing.
    this.persistStory();
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
    switch (this.phase) {
      case 'cinematic':
        this.finishCinematic();
        return;
      case 'phone':
        this.closePhone();
        return;
      case 'playing':
      case 'paused':
      case 'reading':
        this.togglePause();
        return;
      default:
        // Loading, the title screen, character creation and conversations
        // have nothing to go back to.
        return;
    }
  }

  /**
   * The campus map is the master plan, so indoors "you are here" is the door
   * of the building you are in, and an indoor objective is marked at its
   * building's door.
   */
  private openMap(): void {
    let here: Vec2Tuple = [this.player.position.x, this.player.position.z];
    if (this.location !== 'campus') {
      const entrance = ENTRANCES.find((candidate) => candidate.interior === this.location);
      if (entrance) {
        here = planPoint(entrance.outdoor.at);
      }
    }
    const target = this.objective?.target ?? null;
    let mapTarget: Vec2Tuple | null = null;
    if (target?.location === 'campus') {
      mapTarget = [target.x, target.z];
    } else if (target) {
      const entrance = ENTRANCES.find((candidate) => candidate.interior === target.location);
      mapTarget = entrance ? planPoint(entrance.outdoor.at) : null;
    }
    this.overlays.showMap(here[0], here[1], this.player.yaw, mapTarget);
  }

  private closeMap(): void {
    this.overlays.hideMap();
  }

  private handleInteract(): void {
    switch (this.phase) {
      case 'reading':
        this.closeInfo();
        return;
      case 'ready':
        this.handleStart();
        return;
      case 'dialogue':
        this.advanceDialogue();
        return;
      case 'playing':
        if (this.currentFocus) {
          this.useInteractable(this.currentFocus);
        }
        return;
      default:
        return;
    }
  }

  private useInteractable(focus: Interactable): void {
    const action = focus.action;
    switch (action?.kind) {
      case 'talk':
        this.startDialogue(action.who);
        return;
      case 'place':
        this.usePlace(action.place);
        return;
      case 'enter':
        this.enterBuilding(action.entrance, focus);
        return;
      case 'exit':
        this.leaveBuilding(action.entrance);
        return;
      default:
        // Reading something is remembered, so a mission step like "read the
        // campus sign" counts even if the player read it before being asked to.
        if (this.story?.setFlag(`seen:${focus.id}`)) {
          this.onStoryChanged(true);
        }
        this.openInfo(focus);
    }
  }

  // ============================================================ buildings

  private enterBuilding(entranceId: string, door: Interactable): void {
    const entrance = findEntrance(entranceId);
    if (!entrance || !this.story) {
      return;
    }
    if (!this.story.meets(entrance.requires)) {
      this.openInfo(door);
      return;
    }
    void this.moveTo(entrance.interior, { at: entrance.indoorSpawn.at, yawDegrees: entrance.indoorSpawn.yawDegrees }, INTERIORS[entrance.interior].name);
  }

  private leaveBuilding(entranceId: string): void {
    const entrance = findEntrance(entranceId);
    if (!entrance) {
      return;
    }
    const at = planPoint(entrance.outdoorSpawn.at);
    void this.moveTo('campus', { at, yawDegrees: entrance.outdoorSpawn.yawDegrees }, resolveZoneName(at[0], at[1]));
  }

  /**
   * Fades to black, swaps the world, places the player, and fades back in.
   * The swap happens behind the black, so the player never sees the campus
   * vanish or the room assemble.
   */
  private async moveTo(location: LocationId, spawn: { at: Vec2Tuple; yawDegrees: number }, label: string): Promise<void> {
    if (this.phase !== 'playing') {
      return;
    }
    this.phase = 'transition';
    this.releaseForUi();
    await this.overlays.coverForTransition(label);
    this.location = location;
    this.applyLocationContents();
    this.player.reset({ position: [spawn.at[0], spawn.at[1]], yawDegrees: spawn.yawDegrees });
    this.cameraRig.snap();
    this.onStoryChanged(true);
    this.renderFrame(0);
    this.overlays.revealAfterTransition();
    this.enterPlaying();
  }

  // ======================================================== story places

  private usePlace(id: string): void {
    const story = this.story;
    const place = STORY_PLACES.find((candidate) => candidate.id === id);
    if (!story || !place) {
      return;
    }
    story.setFlag(`seen:place:${place.id}`);
    if (place.action.kind === 'sleep' && story.meets(place.action.requires)) {
      this.sleep();
      return;
    }
    const reading = place.readings.find((candidate) => story.meets(candidate.when)) ?? place.readings[place.readings.length - 1];
    if (!reading) {
      return;
    }
    for (const effect of reading.effects ?? []) {
      story.apply(effect);
    }
    this.onStoryChanged(true);
    this.openInfo({
      eyebrow: place.eyebrow,
      title: reading.title ?? place.title,
      body: reading.body,
      ...(reading.bullets ? { bullets: reading.bullets } : {}),
    });
  }

  /** Freezes play and shows a sign, plaque or story card. */
  private openInfo(content: InfoContent): void {
    this.phase = 'reading';
    this.input.clear();
    // Release the lock so the player can click "Close". Releasing it through
    // this method marks it intentional, so it does not also pause the game.
    this.releaseForUi();
    this.overlays.showInfo(content);
    this.needsRender = true;
  }

  /** Clears the prompt and frees the mouse before a menu or conversation opens. */
  private releaseForUi(): void {
    this.input.clear();
    this.currentFocus = null;
    this.hud.setFocus(null, this.touchMode);
    if (this.touchMode) {
      this.touchInput.setInteractAvailable(false);
    } else {
      this.keyboardMouse.releasePointerLock();
    }
  }

  private closeInfo(): void {
    if (this.phase !== 'reading') {
      return;
    }
    const next = this.pendingCards.shift();
    if (next) {
      this.overlays.showInfo(next);
      return;
    }
    this.overlays.hideInfo();
    this.enterPlaying();
  }

  // ================================================================ story

  private startDialogue(who: string): void {
    const story = this.story;
    const member = findCastMember(who);
    if (!story || !member) {
      return;
    }
    const talk = member.talks.find((entry) => story.meets(entry.when));
    const tree = talk ? DIALOGUES.get(talk.dialogue) : undefined;
    if (!tree) {
      console.warn(`[story] no conversation available for "${who}"`);
      return;
    }
    this.conversation = { runner: new DialogueRunner(tree, story), who };
    this.npcs.face(who, this.player.position.x, this.player.position.z);
    this.phase = 'dialogue';
    this.releaseForUi();
    this.showDialogueLine();
    this.needsRender = true;
  }

  private showDialogueLine(): void {
    const line = this.conversation?.runner.current();
    if (!line) {
      this.endDialogue();
      return;
    }
    this.dialogueBox.show(
      { speaker: this.speakerFor(line.speaker), text: line.text, choices: line.choices },
      this.touchMode,
    );
  }

  private advanceDialogue(): void {
    if (this.phase !== 'dialogue' || !this.conversation) {
      return;
    }
    this.conversation.runner.advance();
    this.showDialogueLine();
  }

  private chooseDialogue(index: number): void {
    if (this.phase !== 'dialogue' || !this.conversation) {
      return;
    }
    this.conversation.runner.select(index);
    this.showDialogueLine();
  }

  private endDialogue(): void {
    this.conversation = null;
    this.dialogueBox.hide();
    // Every conversation can change the story, so every one ends with a save
    // (GAME_DESIGN.md §7 asks for one after any major decision at least).
    this.onStoryChanged(true);
    const card = this.pendingCards.shift();
    if (card) {
      this.openInfo(card);
      return;
    }
    this.enterPlaying();
  }

  private speakerFor(id: string): DialogueSpeaker {
    if (id === 'player' && this.story) {
      return { name: this.story.profile.name, role: 'You', accent: PLAYER_ACCENT };
    }
    const member = findCastMember(id);
    return member
      ? { name: member.name, role: member.role, accent: member.accent }
      : { name: id, role: '', accent: '#5b6168' };
  }

  /** Ends the day: the night card, then morning beside the bed in A-214. */
  private sleep(): void {
    const story = this.story;
    if (!story) {
      return;
    }
    const day = story.day;
    story.sleep();
    story.setFlag(`slept_day_${day}`);
    if (this.location !== WAKE_SPOT.location) {
      this.location = WAKE_SPOT.location;
      this.applyLocationContents();
    }
    const [x, z] = locationPoint(WAKE_SPOT.location, WAKE_SPOT.at);
    this.player.reset({ position: [x, z], yawDegrees: WAKE_SPOT.yawDegrees });
    this.cameraRig.snap();
    this.onStoryChanged(true);
    this.openInfo(day === 1 ? FIRST_NIGHT_CARD : ORDINARY_NIGHT_CARD);
  }

  /**
   * Pushes the story out to everything that shows it — objective card,
   * minimap marker, beacon, phone badge — and optionally saves.
   */
  private onStoryChanged(save: boolean): void {
    const story = this.story;
    const director = this.director;
    if (!story || !director) {
      return;
    }
    // A finished mission hands over to the next one; repeat in case that one
    // is already satisfied by flags set earlier.
    for (let completed = director.settle(); completed; completed = director.settle()) {
      const card = this.completionCard(completed);
      if (card) {
        this.pendingCards.push(card);
      }
    }
    this.objective = director.objective();
    this.hud.setObjective(this.objective.heading, this.objective.text);
    // Characters may have moved (Kojo leaves once he has his phone).
    this.refreshPlacements();
    this.guidance = null;
    this.updateGuidance();
    this.hud.setPhoneBadge(hasUnreadThread(story));
    this.phone.refresh(this.buildPhoneView());
    if (save) {
      this.persistStory();
    }
  }

  private persistStory(): void {
    if (!this.story) {
      return;
    }
    const snapshot = this.snapshotPlayer();
    this.story.position = { location: this.location, x: snapshot.x, z: snapshot.z, yawDegrees: snapshot.yawDegrees };
    saveStory(this.story);
  }

  /** A mission's own completion card, with how the people involved now feel. */
  private completionCard(mission: MissionDef): InfoContent | null {
    const story = this.story;
    if (!mission.completion || !story) {
      return null;
    }
    const people = mission.completion.people.flatMap((id) => {
      const member = findCastMember(id);
      return member ? [`${member.name}: ${standingLabel(story.relationship(id))}`] : [];
    });
    return {
      eyebrow: `${mission.code} complete`,
      title: mission.completion.title,
      body: mission.completion.body,
      bullets: [...people, `Next: ${mission.completion.next}`, 'Progress saved on this device'],
    };
  }

  /**
   * Points the marker — minimap and beacon — at the objective, or at the way
   * to it. A target inside another building is reached through that
   * building's door; from inside a building, through the way out; inside the
   * right building but the wrong room, through the room's doorway. So the
   * marker never asks the player to walk through a wall.
   */
  private updateGuidance(): void {
    const target = this.objective?.target ?? null;
    let next: Vec2Tuple | null = null;
    if (target && target.location === this.location) {
      next = [target.x, target.z];
      if (this.interior) {
        const room = roomAt(this.interior.def, target.x, target.z);
        const here = roomAt(this.interior.def, this.player.position.x, this.player.position.z);
        if (room?.door && here?.id !== room.id) {
          next = room.door;
        }
      }
    } else if (target && this.location === 'campus') {
      const entrance = ENTRANCES.find((candidate) => candidate.interior === target.location);
      next = entrance ? planPoint(entrance.outdoor.at) : null;
    } else if (target && this.interior) {
      const exit = this.interior.def.exits[0];
      next = exit ? exit.at : null;
    }
    const current = this.guidance;
    if (current === next || (current && next && current[0] === next[0] && current[1] === next[1])) {
      return;
    }
    this.guidance = next;
    this.hud.setGuidance(next);
    // Indoors the beacon hangs lower, under the ceiling.
    this.beacon.setTarget(next, this.interior ? 2.25 : 2.9);
  }

  private togglePhone(): void {
    if (this.phase === 'phone') {
      this.closePhone();
    } else if (this.phase === 'playing') {
      this.openPhone();
    }
  }

  private openPhone(tab?: PhoneTab): void {
    if (!this.story) {
      return;
    }
    this.phase = 'phone';
    this.releaseForUi();
    // An unread message is the likeliest reason to open it.
    this.phone.show(this.buildPhoneView(), tab ?? (hasUnreadThread(this.story) ? 'messages' : undefined));
    this.needsRender = true;
  }

  private closePhone(): void {
    if (this.phase !== 'phone') {
      return;
    }
    this.overlays.hideMap();
    this.phone.hide();
    this.enterPlaying();
  }

  private handleThreadOpened(id: string): void {
    const thread = MESSAGE_THREADS.find((candidate) => candidate.id === id);
    if (thread?.readFlag && this.story?.setFlag(thread.readFlag)) {
      this.onStoryChanged(true);
    }
  }

  private buildPhoneView(): PhoneView {
    const story = this.story;
    const director = this.director;
    if (!story || !director) {
      return EMPTY_PHONE;
    }
    const objective = director.objective();
    const mission = director.mission;
    // Done steps and the current one; later steps stay a surprise.
    const steps = mission
      ? mission.steps.slice(0, director.stepIndex(mission) + 1).map((step) => ({
          text: step.objective,
          done: story.hasFlag(step.doneWhen),
        }))
      : [];
    const axes: ReputationAxis[] = ['integrity', 'popularity', 'academic'];
    return {
      clock: formatClock(story.minutes),
      day: `Day ${story.day}`,
      mission: { heading: objective.heading, current: objective.text, steps },
      threads: visibleThreads(story).map((thread) => ({
        id: thread.id,
        title: thread.title,
        unread: thread.readFlag !== null && !story.hasFlag(thread.readFlag),
        messages: thread.messages,
      })),
      profile: [
        { label: 'Name', value: story.profile.name },
        { label: 'Addressed as', value: ADDRESS_LABELS[story.profile.address] },
        { label: 'Programme', value: `${PROGRAMMES[story.profile.programme]} · Level 100` },
        { label: 'Home', value: HOMES[story.profile.home] },
        { label: 'Room', value: story.hasFlag('has_student_id') ? 'Hastech Block A · A-214' : 'Not assigned yet' },
      ],
      reputation: axes.map((axis) => ({ label: REPUTATION_LABELS[axis], value: story.reputationValue(axis) })),
      people: CAST.filter((member) => story.hasFlag(`met:${member.id}`)).map((member) => ({
        name: member.name,
        role: member.role,
        standing: standingLabel(story.relationship(member.id)),
        accent: member.accent,
      })),
    };
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
        interiorBatches: this.interior?.stats.batches ?? 0,
        geometries: this.engine.webglRenderer.info.memory.geometries,
        textures: this.engine.webglRenderer.info.memory.textures,
      }),
      getPhase: () => this.phase,
      getLocation: () => this.location,
      setFlags: (flags) => {
        if (!this.story) {
          return;
        }
        for (const flag of flags) {
          this.story.setFlag(flag);
        }
        this.onStoryChanged(true);
        this.needsRender = true;
      },
      getStory: () => {
        const story = this.story;
        const director = this.director;
        if (!story || !director) {
          return null;
        }
        const objective = director.objective();
        return {
          name: story.profile.name,
          programme: story.profile.programme,
          missionId: story.missionId,
          objective: objective.text,
          step: objective.step,
          day: story.day,
          clock: formatClock(story.minutes),
          flags: [...story.flagList],
          relationships: Object.fromEntries(CAST.map((member) => [member.id, story.relationship(member.id)])),
        };
      },
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

const EMPTY_PHONE: PhoneView = {
  clock: '',
  day: '',
  mission: { heading: '', current: '', steps: [] },
  threads: [],
  profile: [],
  reputation: [],
  people: [],
};

/** A relationship value (−100…100) in words, for the phone. */
function standingLabel(value: number): string {
  if (value <= -40) {
    return 'Hostile';
  }
  if (value < -10) {
    return 'Wary';
  }
  if (value <= 10) {
    return 'Neutral';
  }
  if (value < 40) {
    return 'Friendly';
  }
  return value < 70 ? 'Close' : 'Trusted';
}
