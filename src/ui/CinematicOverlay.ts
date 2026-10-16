/**
 * Captions, the phone pop-up, the title card and the Skip button over the
 * arrival cinematic. The Skip button is visible from the first frame
 * (STORYLINE.md M00).
 */

import { requireElement } from './dom';

export type CaptionStyle = 'notification' | 'caption' | 'title';

export class CinematicOverlay {
  private readonly root = requireElement('cinematic');
  private readonly notification = requireElement('cinematic-notification');
  private readonly notificationText = requireElement('cinematic-notification-text');
  private readonly caption = requireElement('cinematic-caption');
  private readonly titleCard = requireElement('cinematic-title');
  private readonly tagline = requireElement('cinematic-tagline');
  private readonly fade = requireElement('cinematic-fade');
  private readonly skip = requireElement<HTMLButtonElement>('cinematic-skip');

  constructor(onSkip: () => void) {
    this.skip.addEventListener('click', onSkip);
  }

  show(): void {
    this.root.hidden = false;
    this.skip.focus();
  }

  hide(): void {
    this.root.hidden = true;
  }

  /** Shows the words for a new shot, with a short fade through black. */
  showShot(style: CaptionStyle, text: string): void {
    this.notification.hidden = style !== 'notification';
    this.titleCard.hidden = style !== 'title';
    this.caption.hidden = style !== 'caption';
    this.notificationText.textContent = style === 'notification' ? text : '';
    this.caption.textContent = style === 'caption' ? text : '';
    this.tagline.textContent = style === 'title' ? text : '';

    // Restart the CSS fade animation.
    this.fade.classList.remove('is-fading');
    void this.fade.offsetWidth;
    this.fade.classList.add('is-fading');
  }
}
