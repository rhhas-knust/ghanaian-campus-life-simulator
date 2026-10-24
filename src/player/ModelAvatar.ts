/**
 * The player in third person as a rigged, animated student — the CC0 body
 * kit (`characterRig.ts`) in the outfit from the gameplay HUD reference.
 *
 * Unlike the standing cast, the player's clips are BLENDED by speed rather than
 * switched: idle into walk into jog, each played at the rate that keeps its
 * feet planted. One skinned mesh, one material; only drawn in third person.
 */

import { MeshLambertMaterial, type Scene } from 'three';

import { Character, type BodyKit, type BodyType, type MotionName } from '../actors/characterRig';
import { BODY_MOTION_SETTINGS, THIRD_PERSON_SETTINGS } from '../config/settings';
import type { FigureLook } from '../story/data/cast';
import type { PlayerBody } from './Avatar';
import type { PlayerController } from './PlayerController';

/** Grey shirt, jeans, brown trainers — the HUD mock-up's student. */
const PLAYER_LOOK: Omit<FigureLook, 'body'> = {
  skin: 0x5a3a26,
  hair: 0x1c1410,
  top: 0x7d8288,
  bottom: 0x34425a,
  shoes: 0x8a4a2a,
  height: 1.75,
};

export class ModelAvatar implements PlayerBody {
  private readonly material = new MeshLambertMaterial({ vertexColors: true });
  private readonly characters = new Map<BodyType, Character>();
  private character: Character;
  private visible = false;
  private heading = 0;

  constructor(
    private readonly scene: Scene,
    private readonly kits: Readonly<Record<BodyType, BodyKit>>,
  ) {
    this.character = this.characterFor('man');
  }

  /** Swaps the body, e.g. once character creation says how to address the player. */
  setBody(body: BodyType): void {
    const next = this.characterFor(body);
    if (next === this.character) {
      return;
    }
    this.character.root.visible = false;
    next.root.position.copy(this.character.root.position);
    next.root.rotation.y = this.heading;
    next.root.visible = this.visible;
    this.character = next;
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.character.root.visible = visible;
  }

  update(delta: number, player: PlayerController): void {
    const root = this.character.root;
    root.position.set(player.position.x, 0, player.position.z);

    const target = player.travelYaw ?? player.yaw;
    let gap = target - this.heading;
    gap = Math.atan2(Math.sin(gap), Math.cos(gap));
    this.heading += gap * (1 - Math.exp(-THIRD_PERSON_SETTINGS.avatarTurnSharpness * delta));
    root.rotation.y = this.heading;

    if (!this.visible) {
      return;
    }
    const settings = BODY_MOTION_SETTINGS;
    const speed = player.speed;
    const weights: Record<MotionName, number> = { idle: 0, talk: 0, walk: 0, jog: 0 };
    if (speed <= settings.standingSpeed) {
      weights.idle = 1;
    } else if (speed < settings.walkFrom) {
      const t = (speed - settings.standingSpeed) / (settings.walkFrom - settings.standingSpeed);
      weights.idle = 1 - t;
      weights.walk = t;
    } else if (speed < settings.jogFrom) {
      const t = (speed - settings.walkFrom) / (settings.jogFrom - settings.walkFrom);
      weights.walk = 1 - t;
      weights.jog = t;
    } else {
      weights.jog = 1;
    }
    this.character.blend(weights, {
      walk: Math.min(settings.maxTimeScale, Math.max(0.6, speed / settings.walkNatural)),
      jog: Math.min(settings.maxTimeScale, Math.max(0.7, speed / settings.jogNatural)),
    });
    this.character.update(delta);
  }

  dispose(): void {
    for (const character of this.characters.values()) {
      character.dispose();
    }
    this.material.dispose();
  }

  private characterFor(body: BodyType): Character {
    const existing = this.characters.get(body);
    if (existing) {
      return existing;
    }
    const character = new Character(this.kits[body], { ...PLAYER_LOOK, body }, this.material);
    character.root.name = 'avatar';
    character.root.visible = false;
    this.scene.add(character.root);
    this.characters.set(body, character);
    return character;
  }
}
