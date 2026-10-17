/**
 * The control hints shown on the start and pause screens.
 *
 * Kept as data so the two screens can never disagree, and so the touch list
 * replaces the desktop list wholesale rather than showing a phone player
 * instructions for a keyboard they do not have.
 */

export interface ControlHint {
  readonly keys: string;
  readonly action: string;
}

export const DESKTOP_CONTROLS: readonly ControlHint[] = [
  { keys: 'W A S D', action: 'Walk and strafe (arrow keys also work)' },
  { keys: 'Mouse', action: 'Look around' },
  { keys: 'Shift', action: 'Run' },
  { keys: 'E', action: 'Talk, read a sign, or continue a conversation' },
  { keys: '1 – 4', action: 'Pick a reply in a conversation' },
  { keys: 'Tab', action: 'Phone: objectives, messages, profile' },
  { keys: 'V', action: 'Switch first / third-person view' },
  { keys: 'Esc / P', action: 'Pause and resume' },
];

export const TOUCH_CONTROLS: readonly ControlHint[] = [
  { keys: 'Left stick', action: 'Walk and strafe' },
  { keys: 'Drag right', action: 'Look around' },
  { keys: 'Interact', action: 'Talk to someone or read a sign' },
  { keys: 'Phone button', action: 'Objectives, messages and profile' },
  { keys: 'Camera button', action: 'Switch first / third-person view' },
  { keys: 'Pause button', action: 'Pause, campus map and settings' },
];
