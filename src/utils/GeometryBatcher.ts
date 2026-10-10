/**
 * Geometry batching — the single most important performance decision in Phase 1.
 *
 * A naive build of this campus is roughly 2,500 meshes (every window, column,
 * roof panel, frond and bench slat). On a mid-range Android phone that is
 * 2,500 draw calls per frame and single-digit frame rates.
 *
 * Instead, every world module submits bare geometry plus a transform, tagged
 * with a palette key. At the end of world generation each tag's geometry is
 * merged into ONE `BufferGeometry` and drawn as ONE mesh. The campus lands at
 * about 25–30 draw calls, which any WebGL device can handle.
 *
 * The trade-off: batched geometry is static. Nothing merged here can be moved,
 * hidden or recoloured individually at runtime. Anything that needs to animate
 * (Phase 2's students, vehicles and doors) must be added to the scene directly
 * instead of going through the batcher.
 */

import { Mesh, type BufferGeometry, type Material, type Matrix4 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import type { MaterialKey } from '../config/palette';

export interface BatchBuildOptions {
  /** Supplies the shared material for a palette key. */
  readonly materialFor: (key: MaterialKey) => Material;
  /** Defaults to `true` for everything. */
  readonly castShadow?: (key: MaterialKey) => boolean;
  /** Defaults to `true` for everything. */
  readonly receiveShadow?: (key: MaterialKey) => boolean;
}

export interface BatchStats {
  readonly batches: number;
  readonly submissions: number;
  readonly triangles: number;
}

export class GeometryBatcher {
  private readonly buckets = new Map<MaterialKey, BufferGeometry[]>();
  private submissions = 0;

  /**
   * Submits one piece of geometry.
   *
   * The geometry is cloned, baked into world space and stored, so callers are
   * free to reuse a single shared `BoxGeometry` for hundreds of submissions —
   * which is exactly what the world modules do.
   */
  add(material: MaterialKey, geometry: BufferGeometry, transform: Matrix4): void {
    const baked = geometry.clone().applyMatrix4(transform);
    // Merging requires a uniform index/attribute layout; flattening everything
    // to non-indexed is the simplest way to guarantee it.
    const flattened = baked.index ? baked.toNonIndexed() : baked;
    if (flattened !== baked) {
      baked.dispose();
    }
    // Vertex colours and tangents would break the merge, and we never use them.
    flattened.deleteAttribute('color');
    flattened.deleteAttribute('tangent');

    const bucket = this.buckets.get(material);
    if (bucket) {
      bucket.push(flattened);
    } else {
      this.buckets.set(material, [flattened]);
    }
    this.submissions += 1;
  }

  /** Number of pieces submitted so far — useful for the loading log. */
  get submissionCount(): number {
    return this.submissions;
  }

  /**
   * Merges every bucket and returns one mesh per palette key.
   *
   * Source geometries are disposed as they are consumed, so peak memory is the
   * merged result plus one bucket, not the whole campus twice over.
   */
  build(options: BatchBuildOptions): { meshes: Mesh[]; stats: BatchStats } {
    const meshes: Mesh[] = [];
    let triangles = 0;

    for (const [key, geometries] of this.buckets) {
      if (geometries.length === 0) {
        continue;
      }

      const merged = mergeGeometries(geometries, false);
      for (const geometry of geometries) {
        geometry.dispose();
      }

      if (!merged) {
        // Only happens if attribute layouts diverge — a programming error here.
        console.error(`GeometryBatcher: failed to merge batch "${key}"`);
        continue;
      }

      merged.computeBoundingSphere();
      const mesh = new Mesh(merged, options.materialFor(key));
      mesh.name = `batch:${key}`;
      mesh.castShadow = options.castShadow?.(key) ?? true;
      mesh.receiveShadow = options.receiveShadow?.(key) ?? true;
      // Batches are world-space already and never move.
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      meshes.push(mesh);
      triangles += merged.getAttribute('position').count / 3;
    }

    const stats: BatchStats = {
      batches: meshes.length,
      submissions: this.submissions,
      triangles: Math.round(triangles),
    };

    this.buckets.clear();
    return { meshes, stats };
  }
}
