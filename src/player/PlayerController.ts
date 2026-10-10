/**
 * First-person player.
 *
 * Owns the camera's position and orientation, nothing else. Movement is
 * velocity-based with acceleration and damping rather than teleporting the
 * camera by `speed * delta`, which is what makes it feel like walking instead
 * of sliding on ice — and it matters much more on a touchscreen, where the
 * joystick is far noisier than a keyboard.
 *
 * The player is a vertical cylinder as far as the world is concerned; its
 * ground-plane circle is handed to `CollisionSystem` every frame.
 */

import { Euler, Vector3, type PerspectiveCamera } from 'three';

import { CAMERA_SETTINGS, PLAYER_SETTINGS } from '../config/settings';
import type { CollisionSystem } from '../physics/CollisionSystem';
import type { LookDelta, MovementInput, SpawnDef } from '../types';
import { degToRad } from '../utils/shapes';

export class PlayerController {
  /** Ground-plane position. Y is always 0 here; eye height is added on output. */
  private readonly position = new Vector3();
  private readonly velocity = new Vector3();

  private yaw = 0;
  private pitch = 0;
  /** Accumulated distance walked, which drives the head bob phase. */
  private bobPhase = 0;

  private readonly forwardVector = new Vector3();
  private readonly rightVector = new Vector3();
  private readonly desiredVelocity = new Vector3();
  private readonly orientation = new Euler(0, 0, 0, 'YXZ');

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly collision: CollisionSystem,
  ) {}

  /** Places the player at a spawn point and points them the right way. */
  reset(spawn: SpawnDef): void {
    this.position.set(spawn.position[0], 0, spawn.position[1]);
    this.velocity.set(0, 0, 0);
    this.yaw = degToRad(spawn.yawDegrees);
    this.pitch = 0;
    this.bobPhase = 0;
    this.applyToCamera();
  }

  /** Current ground position, for the HUD and the interaction system. */
  getPosition(target: Vector3): Vector3 {
    return target.copy(this.position);
  }

  /** Unit vector the camera is facing, flattened onto the ground plane. */
  getFlatForward(target: Vector3): Vector3 {
    return target.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  /** Metres per second, used to decide whether to bob the camera. */
  get speed(): number {
    return this.velocity.length();
  }

  /**
   * Advances the player by `delta` seconds.
   *
   * @param look Consumed look delta in radians — applied once, not integrated,
   *             because mouse and touch deltas are already frame-relative.
   */
  update(delta: number, movement: MovementInput, look: LookDelta): void {
    this.applyLook(look);
    this.applyMovement(delta, movement);
    this.applyToCamera();
  }

  private applyLook(look: LookDelta): void {
    this.yaw += look.yaw;
    this.pitch += look.pitch;

    // Keep yaw in a sane range so it never loses float precision over a long
    // session, and clamp pitch so the player cannot roll over backwards.
    const twoPi = Math.PI * 2;
    this.yaw = ((this.yaw % twoPi) + twoPi) % twoPi;
    this.pitch = Math.max(
      -CAMERA_SETTINGS.maxPitch,
      Math.min(CAMERA_SETTINGS.maxPitch, this.pitch),
    );
  }

  private applyMovement(delta: number, movement: MovementInput): void {
    this.getFlatForward(this.forwardVector);
    // Right-hand perpendicular of forward on the ground plane.
    this.rightVector.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const targetSpeed = movement.sprint
      ? PLAYER_SETTINGS.sprintSpeed
      : PLAYER_SETTINGS.walkSpeed;

    this.desiredVelocity
      .copy(this.forwardVector)
      .multiplyScalar(movement.forward)
      .addScaledVector(this.rightVector, movement.right);

    const inputMagnitude = this.desiredVelocity.length();
    if (inputMagnitude > 1e-4) {
      this.desiredVelocity.multiplyScalar(targetSpeed / inputMagnitude);
    } else {
      this.desiredVelocity.set(0, 0, 0);
    }

    // Exponential approach: fast to start, fast to stop, no overshoot, and
    // frame-rate independent.
    const rate = inputMagnitude > 1e-4 ? PLAYER_SETTINGS.acceleration : PLAYER_SETTINGS.damping;
    const blend = 1 - Math.exp(-rate * delta);
    this.velocity.lerp(this.desiredVelocity, blend);

    if (this.velocity.lengthSq() < 1e-6) {
      this.velocity.set(0, 0, 0);
      return;
    }

    const desiredX = this.position.x + this.velocity.x * delta;
    const desiredZ = this.position.z + this.velocity.z * delta;
    const [resolvedX, resolvedZ] = this.collision.resolve(
      desiredX,
      desiredZ,
      PLAYER_SETTINGS.collisionRadius,
    );

    // Bleed off the velocity component that collision just cancelled, so the
    // player does not keep accelerating into a wall and then shoot sideways.
    if (delta > 0) {
      this.velocity.x = (resolvedX - this.position.x) / delta;
      this.velocity.z = (resolvedZ - this.position.z) / delta;
    }

    this.position.x = resolvedX;
    this.position.z = resolvedZ;

    this.bobPhase += this.velocity.length() * delta;
  }

  private applyToCamera(): void {
    const bobbing = this.speed > 0.4;
    const bob = bobbing
      ? Math.sin(this.bobPhase * PLAYER_SETTINGS.bobFrequency * Math.PI) *
        PLAYER_SETTINGS.bobAmplitude
      : 0;

    this.camera.position.set(
      this.position.x,
      PLAYER_SETTINGS.eyeHeight + bob,
      this.position.z,
    );

    this.orientation.set(this.pitch, this.yaw, 0);
    this.camera.quaternion.setFromEuler(this.orientation);
  }
}
