/**
 * Desktop input: WASD/arrows to walk, mouse to look, E to interact, V to
 * switch camera, Tab for the phone, Esc/P to pause.
 *
 * Mouse look uses the Pointer Lock API, which is the only way to get unbounded
 * relative mouse movement in a browser. Pointer lock has two consequences we
 * have to design around:
 *
 *  1. It can only be requested from a user gesture — hence the "Enter Campus"
 *     button rather than locking on load.
 *  2. The browser (or the player pressing Esc) can drop the lock at any time.
 *     When that happens we pause, rather than leaving the player with a camera
 *     that silently stopped responding.
 */

import { CAMERA_SETTINGS } from '../config/settings';
import type { InputState } from './InputState';

const FORWARD_KEYS = new Set(['KeyW', 'ArrowUp']);
const BACKWARD_KEYS = new Set(['KeyS', 'ArrowDown']);
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft']);
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight']);
const SPRINT_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
const INTERACT_KEYS = new Set(['KeyE', 'Enter', 'Space']);
const PAUSE_KEYS = new Set(['Escape', 'KeyP']);
const CAMERA_KEYS = new Set(['KeyV', 'KeyC']);
const PHONE_KEYS = new Set(['Tab']);

export interface KeyboardMouseOptions {
  /** Element pointer lock is requested on. */
  readonly target: HTMLElement;
  /** Called when the pointer lock is lost unexpectedly. */
  readonly onPointerLockLost: () => void;
  /** Multiplier on top of the base sensitivity, from the pause-menu slider. */
  readonly getSensitivity: () => number;
  /** Look input is ignored unless this returns true. */
  readonly isLookEnabled: () => boolean;
  /** Flip vertical look, from the pause-menu setting. */
  readonly isInvertY: () => boolean;
}

export class KeyboardMouseInput {
  private readonly pressed = new Set<string>();
  private attached = false;
  /** True while we are the ones who asked for the lock, to spot unexpected loss. */
  private wantsLock = false;

  constructor(
    private readonly state: InputState,
    private readonly options: KeyboardMouseOptions,
  ) {}

  attach(): void {
    if (this.attached) {
      return;
    }
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    this.attached = true;
  }

  detach(): void {
    if (!this.attached) {
      return;
    }
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    this.attached = false;
  }

  /** Must be called from inside a user gesture (a click or key press). */
  requestPointerLock(): void {
    this.wantsLock = true;
    // Older Safari returns undefined rather than a promise.
    const result: unknown = this.options.target.requestPointerLock();
    if (result instanceof Promise) {
      result.catch(() => {
        // Lock refused (e.g. the document is not focused). Mouse look simply
        // stays off; keyboard movement still works.
        this.wantsLock = false;
      });
    }
  }

  releasePointerLock(): void {
    this.wantsLock = false;
    if (document.pointerLockElement === this.options.target) {
      document.exitPointerLock();
    }
  }

  get hasPointerLock(): boolean {
    return document.pointerLockElement === this.options.target;
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat) {
      return;
    }
    // Typing a name in character creation must not walk, interact or switch
    // the camera — and must be allowed to reach the text box.
    if (isTextEntry(event.target)) {
      return;
    }

    if (PAUSE_KEYS.has(event.code)) {
      // Esc also exits pointer lock on its own; `pointerlockchange` would then
      // fire too. Queueing the pause here keeps `P` and `Esc` behaving alike.
      this.state.queuePause();
      event.preventDefault();
      return;
    }

    if (CAMERA_KEYS.has(event.code)) {
      this.state.queueCameraToggle();
      event.preventDefault();
      return;
    }

    if (PHONE_KEYS.has(event.code)) {
      this.state.queuePhone();
      // Tab would otherwise move focus around the hidden menus.
      event.preventDefault();
      return;
    }

    if (INTERACT_KEYS.has(event.code)) {
      this.state.queueInteract();
      // Space would otherwise scroll the page.
      event.preventDefault();
      return;
    }

    if (this.isMovementKey(event.code)) {
      this.pressed.add(event.code);
      this.updateMovement();
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.pressed.delete(event.code)) {
      this.updateMovement();
    }
  };

  /** Alt-tabbing away must not leave the player walking into a wall forever. */
  private readonly handleBlur = (): void => {
    this.pressed.clear();
    this.updateMovement();
  };

  private readonly handleMouseMove = (event: MouseEvent): void => {
    if (!this.hasPointerLock || !this.options.isLookEnabled()) {
      return;
    }
    const sensitivity = CAMERA_SETTINGS.mouseSensitivity * this.options.getSensitivity();
    const vertical = this.options.isInvertY() ? 1 : -1;
    this.state.addLook(-event.movementX * sensitivity, vertical * event.movementY * sensitivity);
  };

  private readonly handlePointerLockChange = (): void => {
    if (this.hasPointerLock) {
      return;
    }
    // The lock went away. If we still wanted it, something external dropped it
    // (usually the player hitting Esc) — pause rather than carry on blind.
    if (this.wantsLock) {
      this.wantsLock = false;
      this.pressed.clear();
      this.updateMovement();
      this.options.onPointerLockLost();
    }
  };

  private isMovementKey(code: string): boolean {
    return (
      FORWARD_KEYS.has(code) ||
      BACKWARD_KEYS.has(code) ||
      LEFT_KEYS.has(code) ||
      RIGHT_KEYS.has(code) ||
      SPRINT_KEYS.has(code)
    );
  }

  private updateMovement(): void {
    let forward = 0;
    let right = 0;
    let sprint = false;

    for (const code of this.pressed) {
      if (FORWARD_KEYS.has(code)) {
        forward += 1;
      } else if (BACKWARD_KEYS.has(code)) {
        forward -= 1;
      } else if (RIGHT_KEYS.has(code)) {
        right += 1;
      } else if (LEFT_KEYS.has(code)) {
        right -= 1;
      } else if (SPRINT_KEYS.has(code)) {
        sprint = true;
      }
    }

    this.state.keyboard.forward = forward;
    this.state.keyboard.right = right;
    this.state.keyboard.sprint = sprint;
  }
}

function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) {
    return target.type === 'text' || target.type === 'search';
  }
  return target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
}
