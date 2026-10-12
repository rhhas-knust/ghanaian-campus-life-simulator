/**
 * The player's body: where they stand, which way they look, how fast they move.
 *
 * Deliberately knows nothing about the camera. `CameraRig` reads this state
 * and frames it in first or third person; `Avatar` reads it and animates the
 * student model. That split is what lets the camera mode change without the
 * movement feel changing at all.
 *
 * Movement is velocity-based with acceleration and damping, rather than
 * teleporting by `speed * delta` — that is what makes it feel like walking
 * rather than sliding, and it matters most on a noisy touchscreen joystick.
 */

import { Vector3 } from 'three';

import { AUTO_LEVEL_SETTINGS, CAMERA_SETTINGS, PLAYER_SETTINGS } from '../config/settings';
import type { CollisionSystem } from '../physics/CollisionSystem';
import type { LookDelta, MovementInput, SpawnDef } from '../types';
import { degToRad } from '../utils/shapes';

export interface PlayerUpdateOptions {
  /** Ease the view back to the horizon after the player stops looking. */
  readonly autoLevel: boolean;
}

export class PlayerController {
  /** Ground-plane position. Y is always 0; heights are the camera's business. */
  readonly position = new Vector3();
  private readonly velocity = new Vector3();

  private yawRadians = 0;
  private pitchRadians = 0;
  /** Distance walked, which drives the head-bob and walk-cycle phase. */
  private stride = 0;
  private secondsSinceLook = 0;

  private readonly forward = new Vector3();
  private readonly right = new Vector3();
  private readonly desired = new Vector3();

  constructor(private readonly collision: CollisionSystem) {}

  /** Places the player at a spawn point, facing the right way, standing still. */
  reset(spawn: SpawnDef, pitch = 0): void {
    this.position.set(spawn.position[0], 0, spawn.position[1]);
    this.velocity.set(0, 0, 0);
    this.yawRadians = degToRad(spawn.yawDegrees);
    this.pitchRadians = pitch;
    this.stride = 0;
    this.secondsSinceLook = 0;
  }

  /** Look direction around the vertical axis. 0 = north (-Z). */
  get yaw(): number {
    return this.yawRadians;
  }

  get pitch(): number {
    return this.pitchRadians;
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Metres walked so far — the phase for head bob and the walk cycle. */
  get distanceWalked(): number {
    return this.stride;
  }

  /** Direction of travel on the ground plane, as a yaw. Undefined when still. */
  get travelYaw(): number | null {
    if (this.speed < 0.3) {
      return null;
    }
    return Math.atan2(-this.velocity.x, -this.velocity.z);
  }

  /** Unit vector the player is looking along, flattened onto the ground. */
  getFlatForward(target: Vector3): Vector3 {
    return target.set(-Math.sin(this.yawRadians), 0, -Math.cos(this.yawRadians));
  }

  update(delta: number, movement: MovementInput, look: LookDelta, options: PlayerUpdateOptions): void {
    this.applyLook(delta, look, options);
    this.applyMovement(delta, movement);
  }

  private applyLook(delta: number, look: LookDelta, options: PlayerUpdateOptions): void {
    const looked = Math.abs(look.yaw) + Math.abs(look.pitch) > 1e-5;
    this.secondsSinceLook = looked ? 0 : this.secondsSinceLook + delta;

    this.yawRadians += look.yaw;
    this.pitchRadians += look.pitch;

    // Auto-level: once the player has stopped dragging and is walking, ease the
    // view back towards the horizon. This is the main fix for "the camera
    // keeps ending up looking at the sky" on phones.
    if (options.autoLevel && this.secondsSinceLook > AUTO_LEVEL_SETTINGS.delay && this.speed > 0.5) {
      const target = AUTO_LEVEL_SETTINGS.restingPitch;
      const step = AUTO_LEVEL_SETTINGS.rate * delta * Math.min(1, this.speed / PLAYER_SETTINGS.walkSpeed);
      const gap = target - this.pitchRadians;
      this.pitchRadians += Math.sign(gap) * Math.min(Math.abs(gap), step);
    }

    const twoPi = Math.PI * 2;
    this.yawRadians = ((this.yawRadians % twoPi) + twoPi) % twoPi;
    this.pitchRadians = Math.max(CAMERA_SETTINGS.minPitch, Math.min(CAMERA_SETTINGS.maxPitch, this.pitchRadians));
  }

  private applyMovement(delta: number, movement: MovementInput): void {
    this.getFlatForward(this.forward);
    this.right.set(Math.cos(this.yawRadians), 0, -Math.sin(this.yawRadians));

    const targetSpeed = movement.sprint ? PLAYER_SETTINGS.sprintSpeed : PLAYER_SETTINGS.walkSpeed;
    this.desired.copy(this.forward).multiplyScalar(movement.forward).addScaledVector(this.right, movement.right);

    const magnitude = this.desired.length();
    if (magnitude > 1e-4) {
      // A half-pushed joystick walks slowly; a full push walks at full speed.
      this.desired.multiplyScalar((targetSpeed * Math.min(1, magnitude)) / magnitude);
    } else {
      this.desired.set(0, 0, 0);
    }

    // Exponential approach: frame-rate independent, never overshoots.
    const rate = magnitude > 1e-4 ? PLAYER_SETTINGS.acceleration : PLAYER_SETTINGS.damping;
    this.velocity.lerp(this.desired, 1 - Math.exp(-rate * delta));

    if (this.velocity.lengthSq() < 1e-6) {
      this.velocity.set(0, 0, 0);
      return;
    }

    const [x, z] = this.collision.resolve(
      this.position.x + this.velocity.x * delta,
      this.position.z + this.velocity.z * delta,
      PLAYER_SETTINGS.collisionRadius,
    );
    // Bleed off whatever collision cancelled, so the player does not keep
    // accelerating into a wall and then shoot sideways off its end.
    if (delta > 0) {
      this.velocity.x = (x - this.position.x) / delta;
      this.velocity.z = (z - this.position.z) / delta;
    }
    this.position.x = x;
    this.position.z = z;
    this.stride += this.speed * delta;
  }
}
