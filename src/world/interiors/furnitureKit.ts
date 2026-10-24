/**
 * The KayKit furniture pieces, as plain geometry for the batcher.
 *
 * Every piece shares one small palette texture, so the whole kit is ONE
 * material and therefore one draw call per interior, however many pieces a
 * room uses — the same rule as a palette key. The game loads the kit during
 * the loading screen and registers its material under `furnitureKit`; the
 * interior builder only ever sees geometry.
 */

import { Mesh, type BufferGeometry, type Object3D, type Texture } from 'three';

/** Pieces packed into `furniture-kit.glb` by `scripts/assets/build_models.py`. */
export const FURNITURE_PIECES = [
  'bed_single_A',
  'bed_single_B',
  'table_medium',
  'table_medium_long',
  'chair_A_wood',
  'couch',
  'lamp_table',
  'book_set',
  'rug_rectangle_stripes_A',
] as const;

export type FurniturePiece = (typeof FURNITURE_PIECES)[number];

export interface FurnitureKit {
  readonly pieces: ReadonlyMap<FurniturePiece, BufferGeometry>;
  readonly texture: Texture;
}

/** Returns `null` if the file is missing a piece or the texture; the interiors then stay procedural. */
export function furnitureKitFrom(scene: Object3D): FurnitureKit | null {
  const pieces = new Map<FurniturePiece, BufferGeometry>();
  let texture: Texture | null = null;
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    const piece = FURNITURE_PIECES.find((name) => name === object.name);
    const material: unknown = object.material;
    if (piece && material && typeof material === 'object' && 'map' in material) {
      pieces.set(piece, object.geometry as BufferGeometry);
      texture ??= (material.map as Texture | null) ?? null;
    }
  });
  if (!texture || pieces.size !== FURNITURE_PIECES.length) {
    console.warn(`Furniture kit incomplete (${pieces.size}/${FURNITURE_PIECES.length} pieces); using procedural furniture`);
    return null;
  }
  return { pieces, texture };
}
