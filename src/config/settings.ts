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
  near: 0.1,
  /** Radians of yaw per pixel of mouse movement. */
  mouseSensitivity: 0.0022,
  /** Radians of yaw per pixel of touch drag — touch needs a bigger multiplier. */
  touchSensitivity: 0.0042,
  /** Clamp so the player can never look past straight up/down. */
  maxPitch: Math.PI / 2 - 0.05,
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
} as const;
