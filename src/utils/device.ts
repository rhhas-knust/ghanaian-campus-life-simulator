/**
 * Device capability sniffing.
 *
 * Used for two decisions only: whether to show touch controls, and which
 * graphics preset to default to. The player can always override the quality
 * preset from the pause menu, so a wrong guess is never fatal.
 */

import type { QualityLevel } from '../config/settings';

/**
 * True when the primary input is a touchscreen.
 *
 * `maxTouchPoints` is the reliable signal; the pointer media query catches
 * tablets that also report a mouse. We deliberately do NOT sniff the user
 * agent string — it lies, and Android browsers lie the most.
 */
export function isTouchPrimary(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return hasTouchPoints && coarsePointer;
}

/** True when the Pointer Lock API is usable — desktop mouse-look depends on it. */
export function supportsPointerLock(): boolean {
  return typeof document !== 'undefined' && 'pointerLockElement' in document;
}

/**
 * Picks a starting graphics preset.
 *
 * Heuristic, in order of usefulness:
 *  - `deviceMemory` (Chrome on Android reports this): under 4 GB means `low`.
 *  - `hardwareConcurrency`: four cores or fewer is a budget phone.
 *  - A coarse pointer at all defaults to `medium` rather than `high`.
 */
export function guessQualityLevel(): QualityLevel {
  const touch = isTouchPrimary();

  // `deviceMemory` is non-standard, so it is not in the DOM lib typings.
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (typeof deviceMemory === 'number' && deviceMemory <= 4) {
    return 'low';
  }
  if (cores <= 4) {
    return touch ? 'low' : 'medium';
  }
  return touch ? 'medium' : 'high';
}

/** Reads a persisted preference, tolerating private-mode storage errors. */
export function readStoredValue(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes a preference, silently giving up when storage is unavailable. */
export function writeStoredValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing, blocked cookies, quota — none of it is worth a crash.
  }
}

/** Deletes a stored value, silently giving up when storage is unavailable. */
export function removeStoredValue(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Same as above: nothing worth crashing over.
  }
}
