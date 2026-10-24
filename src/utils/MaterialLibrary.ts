/**
 * Turns the plain-data `MATERIAL_LIBRARY` into real Three.js materials.
 *
 * Exactly one `MeshLambertMaterial`/`MeshStandardMaterial` exists per palette
 * key, shared by every object that uses it. That is what lets the geometry
 * batcher collapse the whole campus into roughly a dozen draw calls.
 *
 * `MeshLambertMaterial` is used on the low preset: it skips the physically based
 * lighting maths entirely, which is a measurable win on phones with weak GPUs
 * and looks near-identical for flat-coloured, untextured geometry.
 */

import {
  Color,
  DoubleSide,
  FrontSide,
  MeshLambertMaterial,
  MeshStandardMaterial,
  type Material,
  type Texture,
} from 'three';

import { MATERIAL_LIBRARY, type MaterialDef, type MaterialKey } from '../config/palette';

export type ShadingModel = 'lambert' | 'standard';

export class MaterialLibrary {
  private readonly cache = new Map<MaterialKey, Material>();

  constructor(private readonly shading: ShadingModel) {}

  /** Returns the shared material for a palette key, creating it on first use. */
  get(key: MaterialKey): Material {
    const existing = this.cache.get(key);
    if (existing) {
      return existing;
    }
    const created = this.create(MATERIAL_LIBRARY[key], key);
    this.cache.set(key, created);
    return created;
  }

  /**
   * Supplies a hand-built material for a key — used for the sign-text atlas,
   * whose material needs a generated texture that plain palette data cannot
   * describe. Must be called before `get()` is first asked for that key.
   */
  register(key: MaterialKey, material: Material): void {
    this.cache.get(key)?.dispose();
    material.name = key;
    this.cache.set(key, material);
  }

  /**
   * Builds a key's material around a texture, with the library's shading
   * model — the furniture kit's palette texture, for instance. The texture is
   * not owned: disposing the library leaves it for its loader to keep.
   */
  registerTextured(key: MaterialKey, map: Texture): void {
    const def = MATERIAL_LIBRARY[key];
    const material =
      this.shading === 'lambert'
        ? new MeshLambertMaterial({ map })
        : new MeshStandardMaterial({ map, roughness: def.roughness, metalness: def.metalness });
    this.register(key, material);
  }

  /** Frees every GPU-side material. Called when the game tears down. */
  dispose(): void {
    for (const material of this.cache.values()) {
      material.dispose();
    }
    this.cache.clear();
  }

  private create(def: MaterialDef, key: MaterialKey): Material {
    const side = def.side === 'double' ? DoubleSide : FrontSide;
    const colour = new Color(def.colour);

    if (this.shading === 'lambert') {
      const material = new MeshLambertMaterial({
        color: colour,
        side,
        flatShading: def.flatShading ?? false,
      });
      if (def.emissive !== undefined) {
        material.emissive = new Color(def.emissive);
        material.emissiveIntensity = def.emissiveIntensity ?? 1;
      }
      material.name = key;
      return material;
    }

    const material = new MeshStandardMaterial({
      color: colour,
      roughness: def.roughness,
      metalness: def.metalness,
      side,
      flatShading: def.flatShading ?? false,
    });
    if (def.emissive !== undefined) {
      material.emissive = new Color(def.emissive);
      material.emissiveIntensity = def.emissiveIntensity ?? 1;
    }
    material.name = key;
    return material;
  }
}
