/**
 * Tuning constants — EDITABLE DATA FILE.
 *
 * Player feel, camera behaviour and the three graphics-quality presets all live
 * here. Nothing in this file touches Three.js, so it is safe to tweak without
 * understanding the renderer.
 */

export type QualityLevel = 'low' | 'medium' | 'high';

export interface QualityPreset {
  readonly label: string;
  /** Hard cap on `renderer.setPixelRatio`. The single biggest mobile GPU win. */
  readonly pixelRatioCap: number;
  readonly antialias: boolean;
  readonly shadows: boolean;
  readonly shadowMapSize: number;
  /** Camera far plane, in metres. */
  readonly drawDistance: number;
  /** Multiplier applied to every scatter zone's tree/shrub count (0–1). */
  readonly scatterDensity: number;
  /** Whether lamp posts get real point lights (expensive) or just glowing glass. */
  readonly lampPointLights: boolean;
  /** Fog start/end as a fraction of `drawDistance`. */
  readonly fogNearFactor: number;
  readonly fogFarFactor: number;
  /** `full` = framed windows every 3.2 m; `simple` = bare panes every 4.2 m. */
  readonly windowDetail: 'full' | 'simple';
  /** Half-width of the sun's shadow box, which follows the player (metres). */
  readonly shadowRadius: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    label: 'Low — best for older phones',
    pixelRatioCap: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    drawDistance: 180,
    scatterDensity: 0.45,
    lampPointLights: false,
    fogNearFactor: 0.35,
    fogFarFactor: 0.98,
    windowDetail: 'simple',
    shadowRadius: 40,
  },
  medium: {
    label: 'Medium',
    pixelRatioCap: 1.5,
    antialias: false,
    shadows: true,
    shadowMapSize: 1024,
    drawDistance: 260,
    scatterDensity: 0.75,
    lampPointLights: false,
    fogNearFactor: 0.45,
    fogFarFactor: 1,
    windowDetail: 'full',
    shadowRadius: 45,
  },
  high: {
    label: 'High — desktop',
    pixelRatioCap: 2,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    drawDistance: 340,
    scatterDensity: 1,
    lampPointLights: true,
    fogNearFactor: 0.55,
    fogFarFactor: 1,
    windowDetail: 'full',
    shadowRadius: 60,
  },
};

/** Player movement + body dimensions, in metres and metres/second. */
export const PLAYER_SETTINGS = {
  /** Camera height above ground — roughly eye level for an adult. */
  eyeHeight: 1.68,
  walkSpeed: 4.2,
  sprintSpeed: 7.4,
  /** Higher = snappier starts/stops. Units: 1/second. */
  acceleration: 12,
  damping: 11,
  /** Horizontal radius used for collision — a capsule seen from above. */
  collisionRadius: 0.42,
  /** Gentle vertical bob while walking, to sell the footsteps. */
  bobAmplitude: 0.035,
  bobFrequency: 1.85,
} as const;

/** Camera look behaviour. Mouse and touch each get their own base sensitivity. */
export const CAMERA_SETTINGS = {
  fieldOfView: 72,
  near: 0.15,
  /** Radians of yaw per pixel of mouse movement. */
  mouseSensitivity: 0.0022,
  /** Radians of yaw per pixel of touch drag — touch needs a bigger multiplier. */
  touchSensitivity: 0.0042,
  /**
   * Vertical drag counts for this fraction of horizontal. Players reported
   * that any swipe on a phone tipped the view up at the sky: a thumb sweeping
   * sideways naturally arcs upwards, and at full vertical sensitivity that arc
   * becomes pitch. Halving it, plus the axis lock below, fixes most of it.
   */
  touchPitchFactor: 0.5,
  /**
   * If a single drag step's vertical movement is less than this fraction of its
   * horizontal movement, it is treated as a sideways swipe and its vertical
   * part is almost ignored.
   */
  touchAxisLockRatio: 0.6,
  touchAxisLockDamping: 0.15,
  /** Look-up / look-down limits in radians (about +50 and -57 degrees). */
  maxPitch: 0.88,
  minPitch: -1.0,
} as const;

/**
 * Auto-levelling: after the player stops dragging and starts walking, the view
 * eases back to the horizon. Default on for touch, off for mouse (where the
 * player's hand is always on the camera anyway). Toggle in the pause menu.
 */
export const AUTO_LEVEL_SETTINGS = {
  /** Seconds without look input before levelling starts. */
  delay: 1.1,
  /** Radians per second at full walking speed. */
  rate: 1.4,
  /** Rest a touch below the horizon, so the path ahead is in view. */
  restingPitch: -0.08,
} as const;

/** Third-person camera: an orbit behind the player, pulled in when blocked. */
export const THIRD_PERSON_SETTINGS = {
  /** Distance behind the player's head, in metres. */
  distance: 4.4,
  /** Height of the point the camera looks at (roughly the shoulders). */
  targetHeight: 1.55,
  /** Elevation of the orbit in radians at level pitch. */
  baseElevation: 0.32,
  minElevation: 0.05,
  maxElevation: 1.05,
  /** Never closer than this to the player, even when squeezed by a wall. */
  minDistance: 1.2,
  /** Clearance kept between the camera and any collider, in metres. */
  wallClearance: 0.4,
  /** Higher = snappier follow. Units: 1/second. */
  followSharpness: 16,
  /** How quickly the avatar turns to face its direction of travel. */
  avatarTurnSharpness: 10,
} as const;

/** Touch joystick geometry, in CSS pixels. Must match `styles.css`. */
export const TOUCH_SETTINGS = {
  joystickRadius: 66,
  knobTravel: 42,
  /** Drag distance below which input is ignored, to avoid jitter from taps. */
  deadZone: 0.14,
} as const;

/** Fixed simulation guard: never integrate more than this in one frame. */
export const MAX_FRAME_DELTA = 1 / 20;

/** localStorage keys for the handful of player preferences we persist. */
export const STORAGE_KEYS = {
  quality: 'gcls.quality',
  sensitivity: 'gcls.sensitivity',
  cameraMode: 'gcls.cameraMode',
  invertY: 'gcls.invertY',
  autoLevel: 'gcls.autoLevel',
  /** The story save. Versioned, so an incompatible future format starts fresh. */
  story: 'gcls.story.v1',
} as const;

/** Story pacing. One real second is one game minute, so a 16-hour day is ~16 minutes. */
export const STORY_SETTINGS = {
  gameMinutesPerSecond: 1,
  /** Arrival-day morning, in minutes after midnight. */
  dayOneStartMinutes: 7 * 60 + 30,
  /** Every later day starts here, after sleeping. */
  wakeMinutes: 7 * 60,
  /** NPCs stop talking and turn back once the player walks this far away. */
  talkRadius: 3.2,
} as const;

export type CameraMode = 'first' | 'third';
