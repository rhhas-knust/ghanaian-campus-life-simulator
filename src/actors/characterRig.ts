/**
 * Rigged, animated characters from the CC0 model packs.
 *
 * The bodies (Quaternius Modular Men/Women) come without animations, and the
 * animations (Quaternius Universal Animation Library) come on a different
 * skeleton. `buildBodyKit` bridges the two once, at load: it RETARGETS each
 * clip onto the body's skeleton by sampling it and copying every mapped
 * bone's rotation relative to a matching reference pose, then bakes the result
 * into ordinary keyframe clips. Nothing is retargeted per frame.
 *
 * It also merges the body's parts into one skinned mesh coloured per vertex,
 * so a character is ONE draw call with ONE shared material, like the
 * placeholder figures it replaces — and recolouring a character (skin, hair,
 * clothes from CHARACTER_BIBLE.md §4) is a colour attribute, not a material.
 */

import {
  AnimationClip,
  AnimationMixer,
  Box3,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  LoopRepeat,
  Quaternion,
  QuaternionKeyframeTrack,
  SkinnedMesh,
  Vector3,
  VectorKeyframeTrack,
  type AnimationAction,
  type Bone,
  type Material,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import type { FigureLook } from '../story/data/cast';

export type BodyType = 'man' | 'woman';
export type MotionName = 'idle' | 'talk' | 'walk' | 'jog';

/** Clip in the animation library for each motion the game plays. */
const MOTION_CLIPS: Record<MotionName, string> = {
  idle: 'Idle_Loop',
  talk: 'Idle_Talking_Loop',
  walk: 'Walk_Loop',
  jog: 'Jog_Fwd_Loop',
};

/**
 * A pose both skeletons can be put in. The bodies are bound in a T-pose, and
 * the library has a T-pose clip, so "rotation since the T-pose" means the same
 * thing on both rigs even though their bones point different ways at rest.
 */
const REFERENCE_CLIP = 'A_TPose';

/**
 * Body bone → library bone, by the names GLTFLoader gives them (it strips the
 * dots: `Shoulder.L` becomes `ShoulderL`). Fingers and toes are left alone:
 * the library animates them, but at this size nobody can see them.
 */
const BONE_MAP: Readonly<Record<string, string>> = {
  Hips: 'DEF-hips',
  Abdomen: 'DEF-spine001',
  Torso: 'DEF-spine002',
  Chest: 'DEF-spine003',
  Neck: 'DEF-neck',
  Head: 'DEF-head',
  ShoulderL: 'DEF-shoulderL',
  UpperArmL: 'DEF-upper_armL',
  LowerArmL: 'DEF-forearmL',
  HandL: 'DEF-handL',
  ShoulderR: 'DEF-shoulderR',
  UpperArmR: 'DEF-upper_armR',
  LowerArmR: 'DEF-forearmR',
  HandR: 'DEF-handR',
  UpperLegL: 'DEF-thighL',
  LowerLegL: 'DEF-shinL',
  FootL: 'DEF-footL',
  UpperLegR: 'DEF-thighR',
  LowerLegR: 'DEF-shinR',
  FootR: 'DEF-footR',
};
const HIPS = 'Hips';

/** Retargeted clips are baked at this rate; the mixer interpolates between samples. */
const SAMPLE_RATE = 30;

/** Material role baked into the body files by `scripts/assets/build_models.py`. */
type Role = 'skin' | 'hair' | 'brows' | 'eyes' | 'top' | 'bottom' | 'shoes' | 'soles';
const ROLES: readonly Role[] = ['skin', 'hair', 'brows', 'eyes', 'top', 'bottom', 'shoes', 'soles'];
const EYES = 0x1a1410;
const SOLES = 0xd8d2c4;

export interface BodyKit {
  readonly body: BodyType;
  /** The body with its parts merged into one skinned mesh; cloned per character. */
  readonly template: Object3D;
  /** Role index per vertex, for colouring a clone. */
  readonly roles: Uint8Array;
  readonly clips: Readonly<Record<MotionName, AnimationClip>>;
  /** Standing height of the model as delivered, in metres. */
  readonly height: number;
}

/** Thrown when a model is not shaped the way this file expects; the game falls back to placeholders. */
export class CharacterRigError extends Error {}

export function buildBodyKit(body: BodyType, bodyScene: Object3D, library: Object3D, libraryClips: readonly AnimationClip[]): BodyKit {
  const parts: SkinnedMesh[] = [];
  bodyScene.traverse((object) => {
    if (object instanceof SkinnedMesh) {
      parts.push(object);
    }
  });
  const first = parts[0];
  if (!first) {
    throw new CharacterRigError(`${body}: no skinned mesh`);
  }
  bodyScene.updateMatrixWorld(true);

  // Merge every part into the first. They must share a skeleton and a bind
  // matrix, which the packs do; anything else would need re-skinning.
  const geometries: BufferGeometry[] = [];
  const roleRuns: { role: number; count: number }[] = [];
  for (const part of parts) {
    if (part.skeleton.bones.length !== first.skeleton.bones.length || part.skeleton.bones.some((bone, i) => bone.name !== first.skeleton.bones[i]?.name)) {
      throw new CharacterRigError(`${body}: parts do not share a skeleton`);
    }
    if (!part.bindMatrix.equals(first.bindMatrix)) {
      throw new CharacterRigError(`${body}: parts have different bind matrices`);
    }
    const material = Array.isArray(part.material) ? part.material[0] : part.material;
    const role = ROLES.indexOf((material?.name ?? '') as Role);
    if (role < 0) {
      throw new CharacterRigError(`${body}: unknown material role "${material?.name ?? ''}"`);
    }
    const geometry = part.geometry.clone();
    for (const name of Object.keys(geometry.attributes)) {
      if (!['position', 'normal', 'skinIndex', 'skinWeight'].includes(name)) {
        geometry.deleteAttribute(name);
      }
    }
    geometries.push(geometry);
    roleRuns.push({ role, count: geometry.getAttribute('position').count });
  }
  const merged = mergeGeometries(geometries, false);
  for (const geometry of geometries) {
    geometry.dispose();
  }
  if (!merged) {
    throw new CharacterRigError(`${body}: could not merge parts`);
  }
  const roles = new Uint8Array(merged.getAttribute('position').count);
  let offset = 0;
  for (const run of roleRuns) {
    roles.fill(run.role, offset, offset + run.count);
    offset += run.count;
  }
  first.geometry.dispose();
  first.geometry = merged;
  for (const part of parts) {
    if (part !== first) {
      part.removeFromParent();
      part.geometry.dispose();
    }
  }

  const bounds = new Box3().setFromObject(first);
  const height = bounds.max.y - bounds.min.y;
  if (!(height > 0.5 && height < 3)) {
    throw new CharacterRigError(`${body}: implausible height ${height.toFixed(2)} m`);
  }

  const reference = libraryClips.find((clip) => clip.name === REFERENCE_CLIP);
  if (!reference) {
    throw new CharacterRigError(`animation library has no ${REFERENCE_CLIP}`);
  }
  const clips = {} as Record<MotionName, AnimationClip>;
  for (const motion of Object.keys(MOTION_CLIPS) as MotionName[]) {
    const source = libraryClips.find((clip) => clip.name === MOTION_CLIPS[motion]);
    if (!source) {
      throw new CharacterRigError(`animation library has no ${MOTION_CLIPS[motion]}`);
    }
    clips[motion] = retarget(bodyScene, library, source, reference, motion);
  }

  return { body, template: bodyScene, roles, clips, height };
}

// ---------------------------------------------------------------------------
// Retargeting
// ---------------------------------------------------------------------------

function bonesByName(root: Object3D): Map<string, Bone> {
  const bones = new Map<string, Bone>();
  root.traverse((object) => {
    if ((object as Bone).isBone) {
      bones.set(object.name, object as Bone);
    }
  });
  return bones;
}

/**
 * The library's skeleton by name. Its file has no mesh and so no skin, which
 * means GLTFLoader loads the joints as plain nodes rather than bones.
 */
function nodesByName(root: Object3D): Map<string, Object3D> {
  const nodes = new Map<string, Object3D>();
  root.traverse((object) => {
    nodes.set(object.name, object);
  });
  return nodes;
}

function worldRotations(bones: ReadonlyMap<string, Object3D>): Map<string, Quaternion> {
  const rotations = new Map<string, Quaternion>();
  for (const [name, bone] of bones) {
    rotations.set(name, bone.getWorldQuaternion(new Quaternion()));
  }
  return rotations;
}

/**
 * Bakes `clip` (on the library skeleton) into a clip for the body skeleton.
 *
 * For each mapped bone: world rotation now = library rotation now × inverse
 * library reference × body bind rotation — "however far the library bone has
 * turned since its T-pose, turn the body bone the same from its T-pose".
 * Bones are solved parent-first so each local rotation can be derived from its
 * parent's freshly posed world rotation. The hips also travel (the bob of a
 * walk), scaled by the ratio of hip heights.
 */
function retarget(target: Object3D, source: Object3D, clip: AnimationClip, reference: AnimationClip, name: MotionName): AnimationClip {
  const sourceBones = nodesByName(source);
  const targetBones = bonesByName(target);
  const hips = targetBones.get(HIPS);
  const sourceHips = sourceBones.get(BONE_MAP[HIPS] ?? '');
  if (!hips || !sourceHips || !hips.parent) {
    throw new CharacterRigError('no hips to retarget from');
  }
  for (const [targetName, sourceName] of Object.entries(BONE_MAP)) {
    if (!targetBones.has(targetName) || !sourceBones.has(sourceName)) {
      throw new CharacterRigError(`cannot map ${targetName} to ${sourceName}`);
    }
  }

  const bindLocal = new Map([...targetBones].map(([boneName, bone]) => [boneName, bone.quaternion.clone()]));
  const bindHipPosition = hips.position.clone();
  target.updateMatrixWorld(true);
  const targetReference = worldRotations(targetBones);
  const targetHipReference = hips.getWorldPosition(new Vector3());

  const mixer = new AnimationMixer(source);
  const referenceAction = mixer.clipAction(reference).play();
  mixer.setTime(0);
  source.updateMatrixWorld(true);
  const sourceReference = worldRotations(sourceBones);
  const sourceHipReference = sourceHips.getWorldPosition(new Vector3());
  referenceAction.stop();
  const hipScale = targetHipReference.y / sourceHipReference.y;

  // Parent-first order, mapped bones only.
  const order: Bone[] = [];
  target.traverse((object) => {
    if ((object as Bone).isBone && BONE_MAP[object.name] !== undefined) {
      order.push(object as Bone);
    }
  });

  const frames = Math.max(2, Math.round(clip.duration * SAMPLE_RATE));
  const times: number[] = [];
  const rotationValues = new Map<string, number[]>(order.map((bone) => [bone.name, []]));
  const hipValues: number[] = [];
  const action = mixer.clipAction(clip).play();
  const parentWorld = new Quaternion();
  const world = new Quaternion();
  const hipWorld = new Vector3();

  for (let frame = 0; frame <= frames; frame += 1) {
    const time = (frame / frames) * clip.duration;
    times.push(time);
    mixer.setTime(time);
    source.updateMatrixWorld(true);
    for (const [boneName, bone] of targetBones) {
      bone.quaternion.copy(bindLocal.get(boneName) ?? bone.quaternion);
    }
    target.updateMatrixWorld(true);

    for (const bone of order) {
      const sourceName = BONE_MAP[bone.name] ?? '';
      const sourceBone = sourceBones.get(sourceName);
      const sourceRest = sourceReference.get(sourceName);
      const targetRest = targetReference.get(bone.name);
      if (!sourceBone || !sourceRest || !targetRest || !bone.parent) {
        continue;
      }
      sourceBone.getWorldQuaternion(world);
      world.multiply(sourceRest.clone().invert()).multiply(targetRest);
      bone.parent.getWorldQuaternion(parentWorld);
      bone.quaternion.copy(parentWorld.invert().multiply(world));
      bone.updateMatrixWorld(true);
      rotationValues.get(bone.name)?.push(bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
    }

    sourceHips.getWorldPosition(hipWorld).sub(sourceHipReference).multiplyScalar(hipScale);
    // Clips are meant to play in place; travel comes from the player's
    // movement, so any forward drift in the source is dropped.
    hipWorld.set(hipWorld.x, hipWorld.y, 0).add(targetHipReference);
    hips.parent.worldToLocal(hipWorld);
    hipValues.push(hipWorld.x, hipWorld.y, hipWorld.z);
  }

  action.stop();
  mixer.stopAllAction();
  mixer.uncacheRoot(source);
  for (const [boneName, bone] of targetBones) {
    bone.quaternion.copy(bindLocal.get(boneName) ?? bone.quaternion);
  }
  hips.position.copy(bindHipPosition);
  target.updateMatrixWorld(true);

  const tracks = [...rotationValues].map(([boneName, values]) => new QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values));
  tracks.push(new VectorKeyframeTrack(`${HIPS}.position`, times, hipValues));
  return new AnimationClip(name, clip.duration, tracks);
}

// ---------------------------------------------------------------------------
// One character
// ---------------------------------------------------------------------------

/**
 * One animated character: a group that faces -Z like the placeholder figures,
 * holding a clone of the body kit coloured to `look`.
 */
export class Character {
  readonly root = new Group();
  private readonly mixer: AnimationMixer;
  private readonly actions: Record<MotionName, AnimationAction>;
  private readonly geometry: BufferGeometry;
  private current: MotionName = 'idle';

  constructor(kit: BodyKit, look: FigureLook, material: Material, phase = 0) {
    const body = cloneSkinned(kit.template);
    let mesh: SkinnedMesh | null = null;
    body.traverse((object) => {
      if (object instanceof SkinnedMesh) {
        mesh = object;
      }
    });
    if (!mesh) {
      throw new CharacterRigError('clone lost its mesh');
    }
    const skinned: SkinnedMesh = mesh;
    // Only the colours are per character. Positions, normals, weights and the
    // index are the same attribute objects in every character of this body,
    // so the GPU holds them once — about 0.5 MB saved per extra character.
    const shared = skinned.geometry;
    this.geometry = new BufferGeometry();
    this.geometry.setIndex(shared.index);
    for (const name of ['position', 'normal', 'skinIndex', 'skinWeight']) {
      this.geometry.setAttribute(name, shared.getAttribute(name));
    }
    this.geometry.setAttribute('color', colourAttribute(kit.roles, look));
    skinned.geometry = this.geometry;
    skinned.material = material;
    skinned.castShadow = true;

    // The packs face +Z; everything in this game faces -Z at rotation 0.
    const scale = look.height / kit.height;
    body.rotation.y = Math.PI;
    body.scale.setScalar(scale);
    this.root.add(body);

    this.mixer = new AnimationMixer(body);
    this.actions = {
      idle: this.mixer.clipAction(kit.clips.idle),
      talk: this.mixer.clipAction(kit.clips.talk),
      walk: this.mixer.clipAction(kit.clips.walk),
      jog: this.mixer.clipAction(kit.clips.jog),
    };
    for (const action of Object.values(this.actions)) {
      action.setLoop(LoopRepeat, Infinity);
      action.play();
      action.setEffectiveWeight(0);
    }
    this.actions.idle.setEffectiveWeight(1);
    // Characters standing together should not breathe in step.
    this.mixer.setTime(phase * kit.clips.idle.duration);
  }

  /** Cross-fades to one motion; used by the standing characters. */
  play(motion: MotionName, fadeSeconds = 0.35): void {
    if (motion === this.current) {
      return;
    }
    const from = this.actions[this.current];
    const to = this.actions[motion];
    to.reset().setEffectiveWeight(1).play();
    from.crossFadeTo(to, fadeSeconds, false);
    this.current = motion;
  }

  /**
   * Sets the blend directly — the player's body mixes idle, walk and jog by
   * speed rather than switching between them. Weights should sum to 1.
   */
  blend(weights: Readonly<Record<MotionName, number>>, timeScales: Readonly<Partial<Record<MotionName, number>>>): void {
    for (const motion of Object.keys(this.actions) as MotionName[]) {
      const action = this.actions[motion];
      action.enabled = true;
      action.setEffectiveWeight(weights[motion]);
      action.setEffectiveTimeScale(timeScales[motion] ?? 1);
    }
  }

  update(delta: number): void {
    this.mixer.update(delta);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mixer.stopAllAction();
    this.geometry.dispose();
  }
}

function colourAttribute(roles: Uint8Array, look: FigureLook): Float32BufferAttribute {
  const colour = new Color();
  const byRole = ROLES.map((role) => {
    switch (role) {
      case 'skin':
        return new Color(look.skin);
      case 'hair':
        return new Color(look.hair);
      case 'brows':
        return new Color(look.hair).multiplyScalar(0.8);
      case 'eyes':
        return new Color(EYES);
      case 'top':
        return new Color(look.top);
      case 'bottom':
        return new Color(look.bottom);
      case 'shoes':
        return new Color(look.shoes);
      case 'soles':
        return new Color(SOLES);
    }
  });
  const values = new Float32Array(roles.length * 3);
  roles.forEach((role, index) => {
    colour.copy(byRole[role] ?? byRole[0] ?? colour);
    values[index * 3] = colour.r;
    values[index * 3 + 1] = colour.g;
    values[index * 3 + 2] = colour.b;
  });
  return new Float32BufferAttribute(values, 3);
}
