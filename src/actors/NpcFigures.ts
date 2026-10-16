/**
 * Placeholder figures for the story characters standing on campus.
 *
 * Each figure is the same simple body as the player's avatar, standing still,
 * merged into ONE mesh with per-vertex colours. Four characters therefore cost
 * four draw calls and one shared material, instead of the dozen meshes and six
 * materials an unmerged avatar would add each — which matters against a
 * campus budget of ~38 draw calls.
 *
 * They are not batched with the campus because they turn to face the player
 * when spoken to, and because rigged, animated characters replace them in
 * roadmap stage D (CHARACTER_BIBLE.md §4).
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

import { planPoint } from '../config/campusLayout';
import type { CastMember, FigureLook } from '../story/data/cast';

const BASE_HEIGHT = 1.75;

interface Figure {
  readonly mesh: Mesh;
  readonly member: CastMember;
}

export class NpcFigures {
  private readonly group = new Group();
  private readonly material = new MeshLambertMaterial({ vertexColors: true });
  private readonly figures = new Map<string, Figure>();

  constructor(scene: Scene, cast: readonly CastMember[]) {
    this.group.name = 'npc-figures';
    for (const member of cast) {
      if (!member.figure || !member.post) {
        continue;
      }
      const mesh = new Mesh(buildFigureGeometry(member.figure), this.material);
      const [x, z] = planPoint(member.post.at);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = (member.post.yawDegrees * Math.PI) / 180;
      mesh.castShadow = true;
      mesh.name = `npc:${member.id}`;
      mesh.visible = member.appears === 'always';
      this.group.add(mesh);
      this.figures.set(member.id, { mesh, member });
    }
    scene.add(this.group);
  }

  /** During the arrival cinematic, show the characters who only appear in it. */
  setOpening(opening: boolean): void {
    for (const figure of this.figures.values()) {
      figure.mesh.visible = figure.member.appears === 'always' || opening;
    }
  }

  /** Turns a character to look at a point on the ground. */
  face(id: string, x: number, z: number): void {
    const figure = this.figures.get(id);
    if (!figure) {
      return;
    }
    const dx = x - figure.mesh.position.x;
    const dz = z - figure.mesh.position.z;
    if (Math.hypot(dx, dz) > 1e-3) {
      // A figure faces -Z at rotation 0, like the player's avatar.
      figure.mesh.rotation.y = Math.atan2(-dx, -dz);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const figure of this.figures.values()) {
      figure.mesh.geometry.dispose();
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
