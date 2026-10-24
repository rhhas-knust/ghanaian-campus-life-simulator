/**
 * Loads the binary models during the loading screen and turns them into what
 * the game uses: a body kit per body type (bodies with retargeted clips) and
 * the furniture kit.
 *
 * Every failure is contained. A missing or malformed file logs a warning and
 * yields `null` for that part; the game then keeps the procedural figures or
 * furniture it has always had. On a slow connection that means a plainer
 * game, not a broken one.
 */

import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { buildBodyKit, type BodyKit, type BodyType } from '../actors/characterRig';
import { MODEL_ASSETS, resolveAssetUrl, type ModelKey } from '../config/assets';
import { furnitureKitFrom, type FurnitureKit } from '../world/interiors/furnitureKit';

export interface LoadedModels {
  readonly bodies: Readonly<Record<BodyType, BodyKit>> | null;
  readonly furniture: FurnitureKit | null;
}

export const NO_MODELS: LoadedModels = { bodies: null, furniture: null };

export async function loadModels(onProgress: (fraction: number) => void): Promise<LoadedModels> {
  const loader = new GLTFLoader();
  const keys: ModelKey[] = ['studentMan', 'studentWoman', 'characterAnimations', 'furnitureKit'];
  let done = 0;
  const load = async (key: ModelKey): Promise<GLTF | null> => {
    try {
      return await loader.loadAsync(resolveAssetUrl(MODEL_ASSETS[key].path));
    } catch (error) {
      console.warn(`Could not load model "${key}"; using placeholders`, error);
      return null;
    } finally {
      done += 1;
      onProgress(done / keys.length);
    }
  };
  const [man, woman, animations, furniture] = await Promise.all(keys.map(load));

  let bodies: Record<BodyType, BodyKit> | null = null;
  if (man && woman && animations) {
    try {
      bodies = {
        man: buildBodyKit('man', man.scene, animations.scene, animations.animations),
        woman: buildBodyKit('woman', woman.scene, animations.scene, animations.animations),
      };
    } catch (error) {
      console.warn('Could not rig the characters; using placeholder figures', error);
    }
  }

  return { bodies, furniture: furniture ? furnitureKitFrom(furniture.scene) : null };
}
