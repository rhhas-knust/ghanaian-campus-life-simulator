/**
 * Material library — EDITABLE DATA FILE.
 *
 * Every surface in the campus references one of these keys instead of creating
 * its own material. That gives us two things that matter on low-end Android
 * devices:
 *
 *  1. One `THREE.Material` instance per key (not per object).
 *  2. A stable key we can batch geometry against, so the whole campus renders in
 *     roughly a dozen draw calls (see `src/utils/GeometryBatcher.ts`).
 *
 * Colours are sampled from Ghanaian building traditions: laterite/ochre render,
 * whitewashed pilasters, deep-shaded verandahs, red-oxide and zinc roofing, and
 * kente accent bands in red, gold, green and black.
 *
 * To restyle the campus, change the numbers here — nothing else needs touching.
 */

export interface MaterialDef {
  /** Base colour as a hex literal, e.g. 0xc98b55. */
  readonly colour: number;
  readonly roughness: number;
  readonly metalness: number;
  /** Flat shading gives low-poly geometry a crisp, stylised look for free. */
  readonly flatShading?: boolean;
  readonly transparent?: boolean;
  readonly opacity?: number;
  /** `double` renders back faces too — needed for single-plane leaves/fronds. */
  readonly side?: 'front' | 'double';
  /** Emissive tint, used for lamp glass so it reads at dusk without a light. */
  readonly emissive?: number;
  readonly emissiveIntensity?: number;
}

export const MATERIAL_LIBRARY = {
  // ---------------------------------------------------------------- ground
  lawn: { colour: 0x5c8a46, roughness: 0.95, metalness: 0 },
  laterite: { colour: 0xb0693d, roughness: 0.98, metalness: 0 },
  pavingLight: { colour: 0xc7c0b0, roughness: 0.85, metalness: 0 },
  pavingDark: { colour: 0xaaa28e, roughness: 0.9, metalness: 0 },
  kerb: { colour: 0xe4ded0, roughness: 0.8, metalness: 0 },

  // ----------------------------------------------------------------- walls
  wallOchre: { colour: 0xc98b55, roughness: 0.92, metalness: 0 },
  wallWhitewash: { colour: 0xf1ebdf, roughness: 0.88, metalness: 0 },
  wallTerracotta: { colour: 0xb4572d, roughness: 0.92, metalness: 0 },
  wallSandcrete: { colour: 0xb8b2a4, roughness: 0.9, metalness: 0 },
  plinth: { colour: 0x8f8778, roughness: 0.95, metalness: 0 },
  breezeBlock: { colour: 0xdcd6c7, roughness: 0.9, metalness: 0 },

  // ------------------------------------------------------------------ roofs
  roofOxide: { colour: 0xa3382a, roughness: 0.78, metalness: 0.08, flatShading: true },
  roofZinc: { colour: 0x8c9398, roughness: 0.55, metalness: 0.32, flatShading: true },
  roofRust: { colour: 0x95492c, roughness: 0.8, metalness: 0.1, flatShading: true },
  fascia: { colour: 0xf1ebdf, roughness: 0.85, metalness: 0 },

  // -------------------------------------------------------------- openings
  glass: { colour: 0x2d4552, roughness: 0.22, metalness: 0.5 },
  shutterGreen: { colour: 0x2f6b4a, roughness: 0.85, metalness: 0 },
  doorWood: { colour: 0x6d4726, roughness: 0.88, metalness: 0 },

  // ----------------------------------------------------------------- props
  woodLight: { colour: 0x9a6c3c, roughness: 0.9, metalness: 0 },
  woodDark: { colour: 0x4d3421, roughness: 0.9, metalness: 0 },
  metalRail: { colour: 0x8b9298, roughness: 0.5, metalness: 0.45 },
  lampGlass: {
    colour: 0xfff2c4,
    roughness: 0.3,
    metalness: 0,
    emissive: 0xffe9a8,
    emissiveIntensity: 0.55,
  },

  // --------------------------------------------------------------- planting
  trunk: { colour: 0x6b5340, roughness: 0.95, metalness: 0, flatShading: true },
  trunkPalm: { colour: 0x8a7256, roughness: 0.95, metalness: 0, flatShading: true },
  leafDark: { colour: 0x2f5d32, roughness: 0.9, metalness: 0, flatShading: true },
  leafMid: { colour: 0x3f7a39, roughness: 0.9, metalness: 0, flatShading: true },
  leafLight: { colour: 0x5a9a42, roughness: 0.9, metalness: 0, flatShading: true },
  frond: {
    colour: 0x5d8c3a,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    side: 'double',
  },
  blossom: { colour: 0xd8452f, roughness: 0.9, metalness: 0, flatShading: true },
  hedge: { colour: 0x3a6b33, roughness: 0.95, metalness: 0, flatShading: true },

  // -------------------------------------------------- signage / kente bands
  signBoard: { colour: 0x0f4d2d, roughness: 0.8, metalness: 0 },
  signPost: { colour: 0x47403a, roughness: 0.7, metalness: 0.2 },
  kenteRed: { colour: 0xce1126, roughness: 0.85, metalness: 0 },
  kenteGold: { colour: 0xfcd116, roughness: 0.7, metalness: 0.15 },
  kenteGreen: { colour: 0x006b3f, roughness: 0.85, metalness: 0 },
  kenteBlack: { colour: 0x1b1b1b, roughness: 0.85, metalness: 0 },
} as const satisfies Record<string, MaterialDef>;

/** Union of every valid material key, e.g. `'wallOchre' | 'roofZinc' | …`. */
export type MaterialKey = keyof typeof MATERIAL_LIBRARY;

/** Sky gradient + fog, tuned for bright tropical West African daylight. */
export const ATMOSPHERE = {
  skyTop: 0x4f9bd4,
  skyHorizon: 0xd9e4e8,
  /** Warm bounce light off red laterite soil. */
  groundBounce: 0xb58b63,
  sunColour: 0xfff4dc,
  fogColour: 0xd3dfe2,
} as const;
