/**
 * M00 "Arrival" — the skippable opening cinematic (STORYLINE.md §2), filmed on
 * the Phase 1 campus with no new art.
 *
 * Each shot moves the camera from one point to another while its aim moves
 * from one target to another. Points are master-plan pixels plus a height in
 * metres. Keep captions short: they are read on a phone, over moving pictures.
 */

import type { PlanPoint } from '../../config/campusLayout';

export interface ShotPoint {
  readonly at: PlanPoint;
  readonly y: number;
}

export interface ShotDef {
  readonly seconds: number;
  readonly from: ShotPoint;
  readonly to: ShotPoint;
  readonly lookFrom: ShotPoint;
  readonly lookTo: ShotPoint;
  /** `notification` shows as a phone pop-up, `caption` as subtitles, `title` as the title card. */
  readonly style: 'notification' | 'caption' | 'title';
  readonly text: string;
}

export const OPENING_SHOTS: readonly ShotDef[] = [
  {
    // 1. Dawn, on the road outside the fence.
    seconds: 6,
    from: { at: [860, 1080], y: 1.6 },
    to: { at: [905, 1076], y: 1.6 },
    lookFrom: { at: [1012, 1000], y: 2.6 },
    lookTo: { at: [1012, 985], y: 2.4 },
    style: 'notification',
    text: 'Congratulations! You have been admitted to UCIS University.',
  },
  {
    // 2. The gate, and the porter.
    seconds: 7,
    from: { at: [1080, 1042], y: 5 },
    to: { at: [1045, 1002], y: 3.4 },
    lookFrom: { at: [950, 958], y: 1.8 },
    lookTo: { at: [957, 961], y: 1.5 },
    style: 'caption',
    text: 'Day one. Suitcases, taxis — and Uncle Bright, who has seen every kind of fresher.',
  },
  {
    // 3. Crane up over the courtyard and its monument.
    seconds: 7,
    from: { at: [1012, 870], y: 12 },
    to: { at: [1012, 770], y: 38 },
    lookFrom: { at: [1012, 600], y: 4 },
    lookTo: { at: [1012, 560], y: 0 },
    style: 'caption',
    text: 'UCIS University. Until Christ is Seen.',
  },
  {
    // 4. West: the lecture halls and the library.
    seconds: 7,
    from: { at: [905, 570], y: 40 },
    to: { at: [770, 430], y: 42 },
    lookFrom: { at: [560, 600], y: 6 },
    lookTo: { at: [400, 560], y: 6 },
    style: 'caption',
    text: 'Lecture halls, the library — and four H-shaped blocks you will soon know by heart.',
  },
  {
    // 5. North-east: the hostels.
    seconds: 7,
    from: { at: [1250, 470], y: 30 },
    to: { at: [1350, 420], y: 26 },
    lookFrom: { at: [1312, 240], y: 6 },
    lookTo: { at: [1312, 215], y: 6 },
    style: 'caption',
    text: 'Hastech Hostels. In Block A, a room is waiting for you.',
  },
  {
    // 6. The shadow beat: a man on the Administration steps, looking at the field.
    seconds: 8,
    from: { at: [786, 338], y: 2.2 },
    to: { at: [780, 330], y: 2.4 },
    lookFrom: { at: [785, 292], y: 1.5 },
    lookTo: { at: [420, 220], y: 1 },
    style: 'caption',
    text: 'Not everyone is watching the freshers. At the far end of the football field, someone is hammering pegs into the grass.',
  },
  {
    // 7. Title card over the courtyard.
    seconds: 5,
    from: { at: [1012, 905], y: 18 },
    to: { at: [1012, 885], y: 23 },
    lookFrom: { at: [1012, 580], y: 8 },
    lookTo: { at: [1012, 580], y: 10 },
    style: 'title',
    text: 'Your campus. Your choices. Your story.',
  },
];
