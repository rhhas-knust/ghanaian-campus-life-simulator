/**
 * A gold diamond floating over the current objective, so the player can find
 * it by looking around rather than by reading the minimap — which on a small
 * phone is the harder of the two.
 *
 * One small unlit mesh: a single draw call, no shadow, no lights.
 */

import { Mesh, MeshBasicMaterial, OctahedronGeometry, type Scene } from 'three';

import type { Vec2Tuple } from '../types';

const DEFAULT_HOVER_HEIGHT = 2.9;
const BOB_METRES = 0.18;
/**
 * Hidden this close to the target. Up close it would float over the face of
 * the person the player is talking to, and the prompt already says what to do.
 */
const HIDE_WITHIN_METRES = 5;

export class ObjectiveBeacon {
  private readonly mesh: Mesh;
  private time = 0;
  private hasTarget = false;
  private hoverHeight = DEFAULT_HOVER_HEIGHT;

  constructor(scene: Scene) {
    const geometry = new OctahedronGeometry(0.32, 0);
    geometry.scale(1, 1.6, 1);
    this.mesh = new Mesh(geometry, new MeshBasicMaterial({ color: 0xf6c445 }));
    this.mesh.name = 'objective-beacon';
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** `hoverHeight` is lower indoors, to stay under the ceiling. */
  setTarget(target: Vec2Tuple | null, hoverHeight = DEFAULT_HOVER_HEIGHT): void {
    this.hasTarget = target !== null;
    this.mesh.visible = this.hasTarget;
    this.hoverHeight = hoverHeight;
    if (target) {
      this.mesh.position.set(target[0], hoverHeight, target[1]);
    }
  }

  update(delta: number, viewerX: number, viewerZ: number): void {
    const distance = Math.hypot(this.mesh.position.x - viewerX, this.mesh.position.z - viewerZ);
    this.mesh.visible = this.hasTarget && distance > HIDE_WITHIN_METRES;
    if (!this.mesh.visible) {
      return;
    }
    this.time += delta;
    this.mesh.rotation.y = this.time * 1.6;
    this.mesh.position.y = this.hoverHeight + Math.sin(this.time * 2.2) * BOB_METRES;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    const material = this.mesh.material;
    if (material instanceof MeshBasicMaterial) {
      material.dispose();
    }
  }
}
