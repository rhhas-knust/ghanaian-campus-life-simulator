/**
 * Android / touchscreen input.
 *
 * Two thumbs, the standard mobile-shooter layout:
 *
 *   LEFT  — a virtual joystick in a fixed ring. Walks and strafes.
 *   RIGHT — a transparent drag surface covering the right 55% of the screen.
 *           Dragging swings the camera; tapping does nothing, so the player can
 *           rest a thumb there.
 *   Interact button — bottom right, enabled only when something is in range.
 *
 * Implemented with Pointer Events rather than Touch Events: one code path for
 * every device, and `setPointerCapture` keeps a drag alive even when the thumb
 * slides outside the element it started in — which happens constantly on a
 * phone-sized screen.
 */

import { CAMERA_SETTINGS, TOUCH_SETTINGS } from '../config/settings';
import type { InputState } from './InputState';

export interface TouchInputOptions {
  readonly joystick: HTMLElement;
  readonly knob: HTMLElement;
  readonly lookSurface: HTMLElement;
  readonly interactButton: HTMLButtonElement;
  readonly getSensitivity: () => number;
  readonly isLookEnabled: () => boolean;
  /** Flip vertical look, from the pause-menu setting. */
  readonly isInvertY: () => boolean;
}

export class TouchInput {
  private joystickPointerId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };

  private lookPointerId: number | null = null;
  private lookLast = { x: 0, y: 0 };

  private attached = false;

  constructor(
    private readonly state: InputState,
    private readonly options: TouchInputOptions,
  ) {}

  attach(): void {
    if (this.attached) {
      return;
    }
    const { joystick, lookSurface, interactButton } = this.options;

    joystick.addEventListener('pointerdown', this.handleJoystickDown);
    joystick.addEventListener('pointermove', this.handleJoystickMove);
    joystick.addEventListener('pointerup', this.handleJoystickUp);
    joystick.addEventListener('pointercancel', this.handleJoystickUp);

    lookSurface.addEventListener('pointerdown', this.handleLookDown);
    lookSurface.addEventListener('pointermove', this.handleLookMove);
    lookSurface.addEventListener('pointerup', this.handleLookUp);
    lookSurface.addEventListener('pointercancel', this.handleLookUp);

    interactButton.addEventListener('click', this.handleInteractClick);

    this.attached = true;
  }

  detach(): void {
    if (!this.attached) {
      return;
    }
    const { joystick, lookSurface, interactButton } = this.options;

    joystick.removeEventListener('pointerdown', this.handleJoystickDown);
    joystick.removeEventListener('pointermove', this.handleJoystickMove);
    joystick.removeEventListener('pointerup', this.handleJoystickUp);
    joystick.removeEventListener('pointercancel', this.handleJoystickUp);

    lookSurface.removeEventListener('pointerdown', this.handleLookDown);
    lookSurface.removeEventListener('pointermove', this.handleLookMove);
    lookSurface.removeEventListener('pointerup', this.handleLookUp);
    lookSurface.removeEventListener('pointercancel', this.handleLookUp);

    interactButton.removeEventListener('click', this.handleInteractClick);

    this.resetJoystick();
    this.lookPointerId = null;
    this.attached = false;
  }

  /** Greys out the interact button when there is nothing to interact with. */
  setInteractAvailable(available: boolean): void {
    this.options.interactButton.disabled = !available;
  }

  // ------------------------------------------------------------- joystick

  private readonly handleJoystickDown = (event: PointerEvent): void => {
    if (this.joystickPointerId !== null) {
      return;
    }
    this.joystickPointerId = event.pointerId;
    // Centre the joystick on the ring, not on where the thumb landed, so the
    // control is predictable.
    const rect = this.options.joystick.getBoundingClientRect();
    this.joystickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.options.joystick.setPointerCapture(event.pointerId);
    this.applyJoystick(event.clientX, event.clientY);
    event.preventDefault();
  };

  private readonly handleJoystickMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickPointerId) {
      return;
    }
    this.applyJoystick(event.clientX, event.clientY);
    event.preventDefault();
  };

  private readonly handleJoystickUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.joystickPointerId) {
      return;
    }
    this.options.joystick.releasePointerCapture(event.pointerId);
    this.resetJoystick();
    event.preventDefault();
  };

  private applyJoystick(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickOrigin.x;
    const dy = clientY - this.joystickOrigin.y;
    const distance = Math.hypot(dx, dy);
    const maxDistance = TOUCH_SETTINGS.joystickRadius;

    // Normalised direction, magnitude capped at 1 at the edge of the ring.
    const magnitude = Math.min(distance / maxDistance, 1);
    const normalisedX = distance > 0 ? dx / distance : 0;
    const normalisedY = distance > 0 ? dy / distance : 0;

    if (magnitude < TOUCH_SETTINGS.deadZone) {
      this.state.touch.forward = 0;
      this.state.touch.right = 0;
      this.moveKnob(0, 0);
      return;
    }

    // Re-map so the dead zone does not eat the bottom of the input range.
    const scaled = (magnitude - TOUCH_SETTINGS.deadZone) / (1 - TOUCH_SETTINGS.deadZone);

    this.state.touch.right = normalisedX * scaled;
    // Screen Y grows downwards; pushing the thumb UP must walk forwards.
    this.state.touch.forward = -normalisedY * scaled;

    const travel = TOUCH_SETTINGS.knobTravel * magnitude;
    this.moveKnob(normalisedX * travel, normalisedY * travel);
  }

  private resetJoystick(): void {
    this.joystickPointerId = null;
    this.state.touch.forward = 0;
    this.state.touch.right = 0;
    this.moveKnob(0, 0);
  }

  private moveKnob(x: number, y: number): void {
    this.options.knob.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  // ----------------------------------------------------------------- look

  private readonly handleLookDown = (event: PointerEvent): void => {
    if (this.lookPointerId !== null) {
      return;
    }
    this.lookPointerId = event.pointerId;
    this.lookLast = { x: event.clientX, y: event.clientY };
    this.options.lookSurface.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  private readonly handleLookMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.lookPointerId) {
      return;
    }
    if (this.options.isLookEnabled()) {
      const sensitivity = CAMERA_SETTINGS.touchSensitivity * this.options.getSensitivity();
      const dx = event.clientX - this.lookLast.x;
      let dy = event.clientY - this.lookLast.y;

      // The swipe fix. A thumb sweeping sideways across a phone screen does not
      // move in a straight line: it arcs, usually upwards. Fed straight into
      // pitch, every sideways swipe tipped the view a little further towards
      // the sky. So: a mostly-horizontal drag step keeps only a sliver of its
      // vertical movement, and vertical drags are weaker than horizontal ones.
      if (Math.abs(dy) < Math.abs(dx) * CAMERA_SETTINGS.touchAxisLockRatio) {
        dy *= CAMERA_SETTINGS.touchAxisLockDamping;
      }
      const vertical = this.options.isInvertY() ? 1 : -1;
      this.state.addLook(-dx * sensitivity, vertical * dy * sensitivity * CAMERA_SETTINGS.touchPitchFactor);
    }
    this.lookLast = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  };

  private readonly handleLookUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.lookPointerId) {
      return;
    }
    this.options.lookSurface.releasePointerCapture(event.pointerId);
    this.lookPointerId = null;
    event.preventDefault();
  };

  // ------------------------------------------------------------- interact

  private readonly handleInteractClick = (): void => {
    this.state.queueInteract();
  };
}
