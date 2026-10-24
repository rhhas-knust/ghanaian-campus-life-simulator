/**
 * The story's cast as rigged, animated characters (see `characterRig.ts`).
 *
 * Same contract as the placeholder `NpcFigures`: told where everyone stands,
 * built once, shown and hidden as the location and story change. Each
 * character is one skinned mesh sharing one vertex-coloured material, so the
 * cast costs a draw call per visible character, as before.
 *
 * Only visible characters are animated, so characters in other locations
 * cost nothing per frame.
 */

import { Group, MeshLambertMaterial, type Scene } from 'three';

import type { CastMember } from '../story/data/cast';
import { Character, type BodyKit, type BodyType } from './characterRig';
import type { StoryFigures } from './NpcFigures';
import type { FigurePlacement } from './storyPlacements';

export class CharacterFigures implements StoryFigures {
  private readonly group = new Group();
  private readonly material = new MeshLambertMaterial({ vertexColors: true });
  private readonly characters = new Map<string, Character>();
  private talking: string | null = null;

  constructor(scene: Scene, cast: readonly CastMember[], kits: Readonly<Record<BodyType, BodyKit>>) {
    this.group.name = 'story-characters';
    cast.forEach((member, index) => {
      if (!member.figure) {
        return;
      }
      // Spread the idle loops so a group never breathes in unison.
      const character = new Character(kits[member.figure.body ?? 'man'], member.figure, this.material, (index * 0.37) % 1);
      character.root.name = `npc:${member.id}`;
      character.root.visible = false;
      this.group.add(character.root);
      this.characters.set(member.id, character);
    });
    scene.add(this.group);
  }

  arrange(placements: readonly FigurePlacement[]): void {
    for (const character of this.characters.values()) {
      character.root.visible = false;
    }
    for (const placement of placements) {
      const character = this.characters.get(placement.id);
      if (character) {
        character.root.position.set(placement.x, 0, placement.z);
        character.root.rotation.y = (placement.yawDegrees * Math.PI) / 180;
        character.root.visible = true;
      }
    }
  }

  face(id: string, x: number, z: number): void {
    const root = this.characters.get(id)?.root;
    if (!root) {
      return;
    }
    const dx = x - root.position.x;
    const dz = z - root.position.z;
    if (Math.hypot(dx, dz) > 1e-3) {
      root.rotation.y = Math.atan2(-dx, -dz);
    }
  }

  setTalking(id: string | null): void {
    if (id === this.talking) {
      return;
    }
    if (this.talking) {
      this.characters.get(this.talking)?.play('idle');
    }
    if (id) {
      this.characters.get(id)?.play('talk');
    }
    this.talking = id;
  }

  update(delta: number): void {
    for (const character of this.characters.values()) {
      if (character.root.visible) {
        character.update(delta);
      }
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const character of this.characters.values()) {
      character.dispose();
    }
    this.material.dispose();
  }
}
