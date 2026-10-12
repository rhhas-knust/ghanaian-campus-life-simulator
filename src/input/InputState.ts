/**
 * Device-agnostic input state.
 *
 * Keyboard/mouse and touch both write into this object; the player controller
 * only ever reads from it. That is what lets the same movement and camera code
 * serve a desktop with a mouse and an Android phone with two thumbs, with no
 * branching anywhere in the simulation.
 */

import type { LookDelta, MovementInput } from '../types';

export class InputState {
  /** Keyboard contribution, each component in -1…1. */
  readonly keyboard = { forward: 0, right: 0, sprint: false };

  /** Touch joystick contribution, each component in -1…1. */
  readonly touch = { forward: 0, right: 0 };

  /** Look delta accumulated since the last frame, in radians. */
  private readonly lookDelta: LookDelta = { yaw: 0, pitch: 0 };

  private interactPending = false;
  private pausePending = false;
  private cameraTogglePending = false;

  private readonly movement: MovementInput = { forward: 0, right: 0, sprint: false };

  /** Adds to this frame's look delta. Called by mouse move and touch drag. */
  addLook(yaw: number, pitch: number): void {
    this.lookDelta.yaw += yaw;
    this.lookDelta.pitch += pitch;
  }

  /** Reads and clears the accumulated look delta. */
  takeLook(): LookDelta {
    const taken: LookDelta = { yaw: this.lookDelta.yaw, pitch: this.lookDelta.pitch };
    this.lookDelta.yaw = 0;
    this.lookDelta.pitch = 0;
    return taken;
  }

  queueInteract(): void {
    this.interactPending = true;
  }

  queuePause(): void {
    this.pausePending = true;
  }

  queueCameraToggle(): void {
    this.cameraTogglePending = true;
  }

  /** Returns true at most once per press. */
  consumeCameraToggle(): boolean {
    const pending = this.cameraTogglePending;
    this.cameraTogglePending = false;
    return pending;
  }

  /** Returns true at most once per press. */
  consumeInteract(): boolean {
    const pending = this.interactPending;
    this.interactPending = false;
    return pending;
  }

  /** Returns true at most once per press. */
  consumePause(): boolean {
    const pending = this.pausePending;
    this.pausePending = false;
    return pending;
  }

  /**
   * Combined movement from every source, clamped to a unit disc so holding
   * forward + strafe is not faster than running straight (and so a fully
   * deflected joystick is never faster than the keyboard).
   */
  readMovement(): MovementInput {
    const forward = clampUnit(this.keyboard.forward + this.touch.forward);
    const right = clampUnit(this.keyboard.right + this.touch.right);
    const magnitude = Math.hypot(forward, right);

    if (magnitude > 1) {
      this.movement.forward = forward / magnitude;
      this.movement.right = right / magnitude;
    } else {
      this.movement.forward = forward;
      this.movement.right = right;
    }
    this.movement.sprint = this.keyboard.sprint;
    return this.movement;
  }

  /** Drops all held input — used when the game is paused or loses focus. */
  clear(): void {
    this.keyboard.forward = 0;
    this.keyboard.right = 0;
    this.keyboard.sprint = false;
    this.touch.forward = 0;
    this.touch.right = 0;
    this.lookDelta.yaw = 0;
    this.lookDelta.pitch = 0;
  }
}

function clampUnit(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value;
}
