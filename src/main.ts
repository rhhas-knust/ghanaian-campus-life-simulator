/**
 * Entry point.
 *
 * Does three things and nothing else: load the stylesheet, start the game, and
 * turn any failure into a message a player can actually act on. WebGL being
 * unavailable is a real outcome on old Android devices and locked-down
 * browsers, so it gets a proper message rather than a blank screen.
 */

import './ui/styles.css';

import { Game } from './core/Game';
import { requireElement } from './ui/dom';

/**
 * Stops the browser treating gameplay touches as page gestures: the long-press
 * context menu, iOS pinch-zoom, and double-tap zoom. Scrolling and
 * pull-to-refresh are already disabled in CSS (`touch-action`,
 * `overscroll-behavior`). Overlays still scroll because they opt back in.
 */
function blockPageGestures(): void {
  const block = (event: Event): void => event.preventDefault();
  window.addEventListener('contextmenu', block);
  document.addEventListener('gesturestart', block);
  document.addEventListener('dblclick', block);
}

async function bootstrap(): Promise<void> {
  blockPageGestures();
  const container = requireElement('viewport');
  const game = new Game(container);
  await game.load();

  // Free GPU resources on navigation. Not strictly required, but it keeps
  // repeated reloads on a memory-constrained phone from piling up contexts.
  window.addEventListener('pagehide', () => game.dispose(), { once: true });
}

bootstrap().catch((error: unknown) => {
  console.error('[campus] failed to start', error);

  const loadingText = document.getElementById('loading-text');
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.hidden = false;
  }
  if (loadingText) {
    loadingText.textContent =
      error instanceof Error && /webgl/i.test(error.message)
        ? 'This device or browser could not start WebGL, which the 3D campus needs. Try an up-to-date Chrome or Firefox, and check that hardware acceleration is enabled.'
        : 'Something went wrong while building the campus. Please reload the page.';
  }
});
