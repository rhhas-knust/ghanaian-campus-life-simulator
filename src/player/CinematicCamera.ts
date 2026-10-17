/**
 * Plays a list of camera shots: each one glides the camera between two points
 * while its aim glides between two targets, eased at both ends.
 *
 * Owns the camera only while a cinematic is running; the game hands control
 * back to `CameraRig` afterwards. Knows nothing about captions — it reports
 * which shot is on screen and the game tells the UI.
 */

import { Vector3, type PerspectiveCamera } from 'three';

import { planPoint } from '../config/campusLayout';
import type { ShotDef, ShotPoint } from '../story/data/opening';

export class CinematicCamera {
  private shots: readonly ShotDef[] = [];
  private index = 0;
  private elapsed = 0;
  private readonly from = new Vector3();
  private readonly to = new Vector3();
  private readonly lookFrom = new Vector3();
  private readonly lookTo = new Vector3();
  private readonly look = new Vector3();

  constructor(private readonly camera: PerspectiveCamera) {}

  start(shots: readonly ShotDef[]): void {
    this.shots = shots;
    this.index = 0;
    this.elapsed = 0;
  }

  get currentShot(): ShotDef | undefined {
    return this.shots[this.index];
  }

  get finished(): boolean {
    return this.index >= this.shots.length;
  }

  /** Where the camera is looking, for keeping shadows near what is on screen. */
  get focus(): Vector3 {
    return this.look;
  }

  /** Advances time. Returns true when a new shot has just started. */
  update(delta: number): boolean {
    const shot = this.shots[this.index];
    if (!shot) {
      return false;
    }
    this.elapsed += delta;
    if (this.elapsed < shot.seconds) {
      return false;
    }
    this.elapsed = 0;
    this.index += 1;
    return !this.finished;
  }

  /** Places the camera for the current moment of the current shot. */
  apply(): void {
    const shot = this.shots[this.index];
    if (!shot) {
      return;
    }
    const t = smoothstep(Math.min(1, this.elapsed / shot.seconds));
    toVector(shot.from, this.from);
    toVector(shot.to, this.to);
    toVector(shot.lookFrom, this.lookFrom);
    toVector(shot.lookTo, this.lookTo);
    this.camera.position.lerpVectors(this.from, this.to, t);
    this.look.lerpVectors(this.lookFrom, this.lookTo, t);
    this.camera.lookAt(this.look);
  }
}

function toVector(point: ShotPoint, out: Vector3): Vector3 {
  const [x, z] = planPoint(point.at);
  return out.set(x, point.y, z);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
