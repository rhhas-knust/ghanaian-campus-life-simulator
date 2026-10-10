/**
 * Asset manifest — EDITABLE DATA FILE.
 *
 * Phase 1 ships with ZERO binary assets: every building, tree and bench is
 * procedural placeholder geometry built from boxes, cylinders and icosahedra.
 * This manifest is the hand-off point for the artist.
 *
 * HOW THE ARTIST REPLACES A PLACEHOLDER
 * -------------------------------------
 *  1. Drop the file into the matching folder under `public/assets/`
 *     (`models/`, `textures/`, `audio/`, `images/`).
 *  2. Add or edit an entry below. Paths are relative to `public/`.
 *  3. Point the campus data at it — e.g. set `model: 'greatHall'` on a building
 *     in `campusLayout.ts`. Any building with a `model` key loads the glTF
 *     instead of generating placeholder geometry.
 *
 * See `public/assets/README.md` and the "Artist asset integration" section of
 * `README.md` for the full brief (scale, orientation, pivot, budgets).
 */

/**
 * Resolves a manifest path against Vite's `base`, so assets keep working under
 * the GitHub Pages sub-directory (`/ghanaian-campus-life-simulator/`) as well as
 * at the root during `npm run dev`.
 */
export function resolveAssetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL;
  const trimmed = relativePath.replace(/^\/+/, '');
  return `${base.endsWith('/') ? base : `${base}/`}${trimmed}`;
}

export interface ModelAsset {
  /** Path under `public/`, e.g. `assets/models/great-hall.glb`. */
  readonly path: string;
  /** Uniform scale applied on load — use 1 if the artist exports in metres. */
  readonly scale: number;
  /** Extra Y rotation in degrees if the model's front does not face -Z. */
  readonly rotationOffsetY?: number;
  readonly credit?: string;
}

/**
 * glTF / GLB building and prop models.
 *
 * EMPTY IN PHASE 1 — this is intentional. Phase 2 fills it in. Example:
 *
 * ```ts
 * export const MODEL_ASSETS = {
 *   greatHall: { path: 'assets/models/great-hall.glb', scale: 1 },
 * } satisfies Record<string, ModelAsset>;
 * ```
 */
export const MODEL_ASSETS = {} satisfies Record<string, ModelAsset>;

export type ModelKey = keyof typeof MODEL_ASSETS;

export interface TextureAsset {
  readonly path: string;
  /** Tiling repeat in world metres — 4 means the texture repeats every 4 m. */
  readonly repeatMetres?: number;
  readonly srgb?: boolean;
  readonly credit?: string;
}

/** Ground, wall and roof textures. Empty in Phase 1 (flat colours are used). */
export const TEXTURE_ASSETS = {} satisfies Record<string, TextureAsset>;

export type TextureKey = keyof typeof TEXTURE_ASSETS;

export interface AudioAsset {
  readonly path: string;
  readonly loop: boolean;
  readonly volume: number;
  readonly credit?: string;
}

/**
 * Ambience and footsteps. Empty in Phase 1 — the prototype is deliberately
 * silent so it never blocks on an autoplay policy or a download on mobile data.
 */
export const AUDIO_ASSETS = {} satisfies Record<string, AudioAsset>;

export type AudioKey = keyof typeof AUDIO_ASSETS;

/** 2D images: UI icons, sign artwork, the artist's campus map reference. */
export const IMAGE_ASSETS = {} satisfies Record<string, TextureAsset>;

export type ImageKey = keyof typeof IMAGE_ASSETS;

/**
 * Budget guidance surfaced in the docs and enforced by review, not by code.
 * Phase 1 targets a mid-range Android phone at 30+ fps.
 */
export const ASSET_BUDGETS = {
  maxTrianglesPerBuilding: 6000,
  maxTrianglesPerProp: 800,
  maxTextureSize: 1024,
  preferredModelFormat: 'glb (glTF 2.0, Draco optional)',
  preferredTextureFormat: 'webp or ktx2',
  preferredAudioFormat: 'ogg (with mp3 fallback)',
  targetTotalDownloadMb: 12,
} as const;
