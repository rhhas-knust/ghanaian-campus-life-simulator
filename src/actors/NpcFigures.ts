/**
 * Placeholder figures for the story characters, on campus and indoors.
 *
 * Each figure is the same simple body as the player's avatar, standing still,
 * merged into ONE mesh with per-vertex colours. Five characters therefore cost
 * at most five draw calls and one shared material, instead of the dozen meshes and six
 * materials an unmerged avatar would add each — which matters against a
 * campus budget of ~38 draw calls.
 *
 * They are not batched with the campus because they turn to face the player
 * when spoken to. They are the FALLBACK now: when the character models load,
 * `CharacterFigures` draws the same cast as rigged, animated bodies instead.
 */

import {
  BoxGeometry,
  CapsuleGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Scene,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { CastMember, FigureLook } from '../story/data/cast';
import type { FigurePlacement } from './storyPlacements';

const BASE_HEIGHT = 1.75;

/** What the game needs from whoever draws the cast. */
export interface StoryFigures {
  arrange(placements: readonly FigurePlacement[]): void;
  face(id: string, x: number, z: number): void;
  /** The character being spoken to, or `null`; animated figures gesture. */
  setTalking(id: string | null): void;
  update(delta: number): void;
  dispose(): void;
}

export class NpcFigures implements StoryFigures {
  private readonly group = new Group();
  private readonly material = new MeshLambertMaterial({ vertexColors: true });
  private readonly meshes = new Map<string, Mesh>();

  constructor(scene: Scene, cast: readonly CastMember[]) {
    this.group.name = 'npc-figures';
    for (const member of cast) {
      if (!member.figure) {
        continue;
      }
      const mesh = new Mesh(buildFigureGeometry(member.figure), this.material);
      mesh.castShadow = true;
      mesh.name = `npc:${member.id}`;
      mesh.visible = false;
      this.group.add(mesh);
      this.meshes.set(member.id, mesh);
    }
    scene.add(this.group);
  }

  /**
   * Shows exactly the characters listed, where listed, and hides everyone
   * else. Called when the location or the story changes; the meshes are built
   * once and reused, so moving between the campus and an interior allocates
   * nothing.
   */
  arrange(placements: readonly FigurePlacement[]): void {
    for (const mesh of this.meshes.values()) {
      mesh.visible = false;
    }
    for (const placement of placements) {
      const mesh = this.meshes.get(placement.id);
      if (mesh) {
        mesh.position.set(placement.x, 0, placement.z);
        mesh.rotation.y = (placement.yawDegrees * Math.PI) / 180;
        mesh.visible = true;
      }
    }
  }

  /** Turns a character to look at a point on the ground. */
  face(id: string, x: number, z: number): void {
    const mesh = this.meshes.get(id);
    if (!mesh) {
      return;
    }
    const dx = x - mesh.position.x;
    const dz = z - mesh.position.z;
    if (Math.hypot(dx, dz) > 1e-3) {
      // A figure faces -Z at rotation 0, like the player's avatar.
      mesh.rotation.y = Math.atan2(-dx, -dz);
    }
  }

  setTalking(): void {
    // Placeholder figures have no gestures.
  }

  update(): void {
    // Nothing moves.
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
    }
    this.material.dispose();
  }
}

/** The avatar's proportions in a standing pose, coloured and merged. */
function buildFigureGeometry(look: FigureLook): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const add = (geometry: BufferGeometry, colour: number, x: number, y: number, z: number): void => {
    geometry.translate(x, y, z);
    const r = ((colour >> 16) & 0xff) / 255;
    const g = ((colour >> 8) & 0xff) / 255;
    const b = (colour & 0xff) / 255;
    const count = geometry.getAttribute('position').count;
    const colours = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      colours[index * 3] = r;
      colours[index * 3 + 1] = g;
      colours[index * 3 + 2] = b;
    }
    geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
    parts.push(geometry);
  };

  add(new BoxGeometry(0.44, 0.58, 0.24), look.top, 0, 1.18, 0);
  add(new SphereGeometry(0.13, 12, 10), look.skin, 0, 1.62, 0);
  add(new SphereGeometry(0.138, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), look.hair, 0, 1.635, 0.008);
  add(new CapsuleGeometry(0.06, 0.06, 4, 8), look.skin, 0, 1.48, 0);
  for (const side of [-1, 1]) {
    // Sleeve, then forearm hanging straight down from the shoulder.
    add(new CapsuleGeometry(0.075, 0.18, 4, 8), look.top, side * 0.28, 1.29, 0);
    add(new CapsuleGeometry(0.065, 0.3, 4, 8), look.skin, side * 0.28, 1.06, 0);
    add(new CapsuleGeometry(0.085, 0.66, 4, 8), look.bottom, side * 0.11, 0.49, 0);
    add(new BoxGeometry(0.13, 0.08, 0.26), look.shoes, side * 0.11, 0.07, -0.04);
  }

  const merged = mergeGeometries(parts);
  for (const part of parts) {
    part.dispose();
  }
  if (!merged) {
    throw new Error('Could not merge an NPC figure');
  }
  const scale = look.height / BASE_HEIGHT;
  merged.scale(scale, scale, scale);
  return merged;
}
