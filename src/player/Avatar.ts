/**
 * The student you see in third-person view, styled on the gameplay HUD
 * reference: short-sleeved grey shirt, jeans, trainers and a brown backpack.
 *
 * Built from a handful of primitives with a simple walk cycle — arms and legs
 * swing from the shoulder and hip. This is the ONE moving thing in the world,
 * so unlike the campus it is NOT merged into the static batches: about ten
 * small meshes, only drawn in third person.
 *
 * It is the FALLBACK body now: when the character models load, `ModelAvatar`
 * draws a rigged, animated student instead. `PlayerBody` is what the game
 * depends on, so either can stand in.
 */

import {
  BoxGeometry,
  CapsuleGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  SphereGeometry,
  type BufferGeometry,
  type Material,
  type Scene,
} from 'three';

import { THIRD_PERSON_SETTINGS } from '../config/settings';
import type { PlayerController } from './PlayerController';

const COLOURS = {
  skin: 0x5a3a26,
  hair: 0x1c1410,
  shirt: 0x7d8288,
  jeans: 0x34425a,
  shoes: 0x8a4a2a,
  backpack: 0x6b4a2e,
} as const;

/** What the game needs from whatever draws the player in third person. */
export interface PlayerBody {
  setVisible(visible: boolean): void;
  update(delta: number, player: PlayerController): void;
  dispose(): void;
}

/** One limb: a group pivoting at the joint, with the mesh hanging below it. */
interface Limb {
  readonly pivot: Group;
}

export class Avatar implements PlayerBody {
  private readonly root = new Group();
  private readonly materials: Material[] = [];
  private readonly geometries: BufferGeometry[] = [];
  private readonly leftArm: Limb;
  private readonly rightArm: Limb;
  private readonly leftLeg: Limb;
  private readonly rightLeg: Limb;
  private heading = 0;
  private swing = 0;

  constructor(scene: Scene) {
    this.root.name = 'avatar';
    const material = (colour: number): MeshLambertMaterial => {
      const created = new MeshLambertMaterial({ color: colour });
      this.materials.push(created);
      return created;
    };
    const skin = material(COLOURS.skin);
    const shirt = material(COLOURS.shirt);
    const jeans = material(COLOURS.jeans);

    // Torso and head.
    this.part(new BoxGeometry(0.44, 0.58, 0.24), shirt, 0, 1.18, 0);
    this.part(new SphereGeometry(0.13, 12, 10), skin, 0, 1.62, 0);
    this.part(new SphereGeometry(0.138, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), material(COLOURS.hair), 0, 1.635, 0.008);
    this.part(new CapsuleGeometry(0.06, 0.06, 4, 8), skin, 0, 1.48, 0);
    // Backpack on the back (+Z is behind the player, who faces -Z).
    this.part(new BoxGeometry(0.36, 0.44, 0.18), material(COLOURS.backpack), 0, 1.2, 0.2);

    this.leftArm = this.limb(skin, shirt, -0.28, 1.43, 0.6, true);
    this.rightArm = this.limb(skin, shirt, 0.28, 1.43, 0.6, true);
    const shoes = material(COLOURS.shoes);
    this.leftLeg = this.limb(jeans, shoes, -0.11, 0.9, 0.86, false);
    this.rightLeg = this.limb(jeans, shoes, 0.11, 0.9, 0.86, false);

    this.root.traverse((object) => {
      if (object instanceof Mesh) {
        object.castShadow = true;
      }
    });
    this.root.visible = false;
    scene.add(this.root);
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
  }

  update(delta: number, player: PlayerController): void {
    this.root.position.set(player.position.x, 0, player.position.z);

    // Turn to face the direction of travel; when standing still, face where
    // the camera looks, so the player can see what they are about to read.
    const target = player.travelYaw ?? player.yaw;
    let gap = target - this.heading;
    gap = Math.atan2(Math.sin(gap), Math.cos(gap));
    this.heading += gap * (1 - Math.exp(-THIRD_PERSON_SETTINGS.avatarTurnSharpness * delta));
    this.root.rotation.y = this.heading;

    // Walk cycle: swing amplitude follows speed, phase follows distance walked.
    const amplitude = Math.min(1, player.speed / 4) * 0.7;
    this.swing += (amplitude - this.swing) * (1 - Math.exp(-10 * delta));
    const phase = Math.sin(player.distanceWalked * 2.4);
    this.leftLeg.pivot.rotation.x = phase * this.swing;
    this.rightLeg.pivot.rotation.x = -phase * this.swing;
    this.leftArm.pivot.rotation.x = -phase * this.swing * 0.8;
    this.rightArm.pivot.rotation.x = phase * this.swing * 0.8;
    // A small bounce in step with the feet.
    this.root.position.y = Math.abs(Math.cos(player.distanceWalked * 2.4)) * 0.04 * this.swing;
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const geometry of this.geometries) {
      geometry.dispose();
    }
    for (const material of this.materials) {
      material.dispose();
    }
  }

  private part(geometry: BufferGeometry, material: Material, x: number, y: number, z: number, parent: Group = this.root): Mesh {
    this.geometries.push(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  /**
   * A limb that pivots at its top joint. Arms: sleeve then forearm. Legs: jeans
   * then shoe.
   */
  private limb(lower: Material, upper: Material, x: number, jointY: number, length: number, isArm: boolean): Limb {
    const pivot = new Group();
    pivot.position.set(x, jointY, 0);
    this.root.add(pivot);
    const radius = isArm ? 0.065 : 0.085;
    if (isArm) {
      this.part(new CapsuleGeometry(radius + 0.01, 0.18, 4, 8), upper, 0, -0.14, 0, pivot);
      this.part(new CapsuleGeometry(radius, length - 0.3, 4, 8), lower, 0, -length * 0.62, 0, pivot);
    } else {
      this.part(new CapsuleGeometry(radius, length - 0.2, 4, 8), lower, 0, -length * 0.48, 0, pivot);
      this.part(new BoxGeometry(0.13, 0.08, 0.26), upper, 0, -length + 0.03, -0.04, pivot);
    }
    return { pivot };
  }
}
