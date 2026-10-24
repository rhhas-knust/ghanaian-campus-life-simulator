/**
 * Frames the player in first or third person.
 *
 * FIRST PERSON: the camera sits at eye height with a gentle walking bob.
 *
 * THIRD PERSON: the camera orbits behind and above the player's shoulders. Yaw
 * comes straight from the look input; pitch becomes the orbit's elevation, so
 * "look down" swings the camera up for a view over the player's head. When a
 * wall, tree or post gets between the player and the camera, the camera pulls
 * in towards the player instead of clipping through it.
 *
 * The world's colliders are 2D footprints, so "blocked" means "this point on
 * the ground is inside a building's footprint". That is exactly the case that
 * matters here: the camera would otherwise end up inside a wall.
 */

import { Euler, Vector3, type PerspectiveCamera } from 'three';

import { PLAYER_SETTINGS, THIRD_PERSON_SETTINGS, type CameraMode } from '../config/settings';
import type { CollisionSystem } from '../physics/CollisionSystem';
import type { PlayerController } from './PlayerController';

/** Points tested along the boom from the player's head out to the camera. */
const BOOM_SAMPLES = 10;

export class CameraRig {
  private currentMode: CameraMode = 'first';
  private boomLength: number = THIRD_PERSON_SETTINGS.distance;
  private readonly orientation = new Euler(0, 0, 0, 'YXZ');
  private readonly target = new Vector3();
  private readonly desired = new Vector3();
  private snapNext = true;
  /** Indoors, the third-person camera must stay under the ceiling. */
  private ceiling: number | null = null;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly collision: CollisionSystem,
  ) {}

  get mode(): CameraMode {
    return this.currentMode;
  }

  setMode(mode: CameraMode): void {
    this.currentMode = mode;
    this.snapNext = true;
  }

  /** `null` outdoors; the ceiling height in metres indoors. */
  setCeiling(height: number | null): void {
    this.ceiling = height;
    this.snapNext = true;
  }

  /** Skip smoothing on the next update — after a teleport or a mode change. */
  snap(): void {
    this.snapNext = true;
  }

  update(delta: number, player: PlayerController): void {
    if (this.currentMode === 'first') {
      this.updateFirstPerson(player);
    } else {
      this.updateThirdPerson(delta, player);
    }
    this.snapNext = false;
  }

  private updateFirstPerson(player: PlayerController): void {
    const bob =
      player.speed > 0.4
        ? Math.sin(player.distanceWalked * PLAYER_SETTINGS.bobFrequency * Math.PI) * PLAYER_SETTINGS.bobAmplitude
        : 0;
    this.camera.position.set(player.position.x, PLAYER_SETTINGS.eyeHeight + bob, player.position.z);
    this.orientation.set(player.pitch, player.yaw, 0);
    this.camera.quaternion.setFromEuler(this.orientation);
  }

  private updateThirdPerson(delta: number, player: PlayerController): void {
    const settings = THIRD_PERSON_SETTINGS;
    this.target.set(player.position.x, settings.targetHeight, player.position.z);

    // Looking up lowers the camera; looking down raises it over the shoulder.
    const elevation = Math.max(
      settings.minElevation,
      Math.min(settings.maxElevation, settings.baseElevation - player.pitch),
    );
    const horizontal = Math.cos(elevation);
    const dirX = Math.sin(player.yaw) * horizontal;
    const dirY = Math.sin(elevation);
    const dirZ = Math.cos(player.yaw) * horizontal;

    // Walk out along the boom and stop at the first sample inside a collider.
    let free: number = settings.distance;
    for (let index = 1; index <= BOOM_SAMPLES; index += 1) {
      const distance = (index / BOOM_SAMPLES) * settings.distance;
      if (
        this.collision.isBlocked(
          this.target.x + dirX * distance,
          this.target.z + dirZ * distance,
          settings.wallClearance,
        )
      ) {
        free = Math.max(settings.minDistance, (distance - settings.distance / BOOM_SAMPLES) * 0.95);
        break;
      }
    }

    // Indoors, a boom long enough to clear the player's shoulders would poke
    // through the ceiling: shorten it so the camera stays in the room.
    if (this.ceiling !== null && dirY > 1e-3) {
      const headroom = this.ceiling - 0.3 - this.target.y;
      free = Math.min(free, Math.max(settings.minDistance, headroom / dirY));
    }

    // Pull in instantly so the camera never visibly passes through a wall;
    // ease back out so it does not jitter along the edge of a corner.
    if (this.snapNext || free < this.boomLength) {
      this.boomLength = free;
    } else {
      this.boomLength += (free - this.boomLength) * (1 - Math.exp(-4 * delta));
    }

    this.desired.set(
      this.target.x + dirX * this.boomLength,
      this.target.y + dirY * this.boomLength,
      this.target.z + dirZ * this.boomLength,
    );

    if (this.snapNext) {
      this.camera.position.copy(this.desired);
    } else {
      this.camera.position.lerp(this.desired, 1 - Math.exp(-settings.followSharpness * delta));
    }
    this.camera.lookAt(this.target);
  }
}
