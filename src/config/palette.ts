/**
 * Material library — EDITABLE DATA FILE.
 *
 * Every surface in the campus references one of these keys instead of creating
 * its own material. One `THREE.Material` exists per key, and the geometry
 * batcher merges everything sharing a key into one mesh — so the number of keys
 * actually used is, roughly, the number of draw calls.
 *
 * Colours are sampled from the concept art in `GAME_ART/` (see
 * `GAME_ART/ART_DIRECTION.md`): cream render, red corrugated roofs, green
 * window frames and balustrades, grey plinths, tan footpaths, dark asphalt.
 */

export interface MaterialDef {
  /** Base colour as a hex literal, e.g. 0xede2c4. */
  readonly colour: number;
  readonly roughness: number;
  readonly metalness: number;
  /** Flat shading gives low-poly geometry a crisp, stylised look for free. */
  readonly flatShading?: boolean;
  /** `double` renders back faces too — needed for single-plane leaves. */
  readonly side?: 'front' | 'double';
  /** Self-lit tint, used for lamp glass so it reads without a real light. */
  readonly emissive?: number;
  readonly emissiveIntensity?: number;
}

export const MATERIAL_LIBRARY = {
  // ---------------------------------------------------------------- ground
  lawn: { colour: 0x6f9b45, roughness: 0.95, metalness: 0 },
  lawnStripe: { colour: 0x5f8c3b, roughness: 0.95, metalness: 0 },
  asphalt: { colour: 0x45484c, roughness: 0.92, metalness: 0 },
  roadMarking: { colour: 0xeceae2, roughness: 0.8, metalness: 0 },
  pavingTan: { colour: 0xe2cd9f, roughness: 0.9, metalness: 0 },
  pavingStone: { colour: 0xc2bdb2, roughness: 0.88, metalness: 0 },
  kerb: { colour: 0xd9d4c8, roughness: 0.85, metalness: 0 },
  courtSurface: { colour: 0x7e8389, roughness: 0.85, metalness: 0 },
  soil: { colour: 0xa86a43, roughness: 0.98, metalness: 0 },

  // ----------------------------------------------------------------- walls
  wallCream: { colour: 0xede0bf, roughness: 0.9, metalness: 0 },
  wallRed: { colour: 0xc0674d, roughness: 0.9, metalness: 0 },
  column: { colour: 0xf3ebd6, roughness: 0.85, metalness: 0 },
  plinth: { colour: 0xa9a59b, roughness: 0.95, metalness: 0 },
  breezeBlock: { colour: 0xd9cfb4, roughness: 0.9, metalness: 0 },

  // ------------------------------------------------------------------ roofs
  roofRed: { colour: 0xb85b46, roughness: 0.75, metalness: 0.1, flatShading: true },
  trimGreen: { colour: 0x4e7a55, roughness: 0.75, metalness: 0.05 },

  // -------------------------------------------------------------- openings
  glass: { colour: 0x33454f, roughness: 0.25, metalness: 0.45 },
  interiorShade: { colour: 0x5a5547, roughness: 1, metalness: 0 },

  // ----------------------------------------------------------------- props
  woodWarm: { colour: 0xa8703f, roughness: 0.85, metalness: 0 },
  concrete: { colour: 0xbab6ad, roughness: 0.92, metalness: 0 },
  metalPole: { colour: 0x9a9d9f, roughness: 0.45, metalness: 0.55 },
  fenceMetal: { colour: 0x3f4440, roughness: 0.6, metalness: 0.4 },
  lampGlass: {
    colour: 0xfff4d2,
    roughness: 0.3,
    metalness: 0,
    emissive: 0xffecb8,
    emissiveIntensity: 0.6,
  },
  canvasWhite: { colour: 0xf2efe7, roughness: 0.9, metalness: 0, flatShading: true },
  carRed: { colour: 0x9c3b34, roughness: 0.4, metalness: 0.5 },
  carSilver: { colour: 0xb7bcc0, roughness: 0.35, metalness: 0.6 },
  carBlue: { colour: 0x3d6194, roughness: 0.4, metalness: 0.5 },
  barrierStripe: { colour: 0xd8382f, roughness: 0.6, metalness: 0.1 },

  // --------------------------------------------------------------- planting
  trunk: { colour: 0x6b5340, roughness: 0.95, metalness: 0, flatShading: true },
  trunkPalm: { colour: 0x8f765a, roughness: 0.95, metalness: 0, flatShading: true },
  leafDark: { colour: 0x356b33, roughness: 0.9, metalness: 0, flatShading: true },
  leafMid: { colour: 0x4b8a3c, roughness: 0.9, metalness: 0, flatShading: true },
  leafLight: { colour: 0x6aa647, roughness: 0.9, metalness: 0, flatShading: true },
  frond: {
    colour: 0x5f9a3e,
    roughness: 0.9,
    metalness: 0,
    flatShading: true,
    side: 'double',
  },
  mangoFruit: { colour: 0xe0a238, roughness: 0.7, metalness: 0, flatShading: true },
  blossom: { colour: 0xd8452f, roughness: 0.9, metalness: 0, flatShading: true },
  hedge: { colour: 0x3f7536, roughness: 0.95, metalness: 0, flatShading: true },

  // ----------------------------------------------------- monument / flags
  monumentStone: { colour: 0xd9d3c5, roughness: 0.85, metalness: 0 },
  kenteRed: { colour: 0xce1126, roughness: 0.85, metalness: 0 },
  kenteGold: { colour: 0xfcd116, roughness: 0.7, metalness: 0.15 },
  kenteGreen: { colour: 0x006b3f, roughness: 0.85, metalness: 0 },
  kenteBlack: { colour: 0x1b1b1b, roughness: 0.85, metalness: 0 },

  /**
   * Text on signs and building name boards. The colour is a placeholder: the
   * real material is built from the generated sign-text atlas
   * (`src/world/SignAtlas.ts`), so every label on campus is ONE draw call.
   */
  signText: { colour: 0xffffff, roughness: 0.8, metalness: 0 },
} as const satisfies Record<string, MaterialDef>;

/** Union of every valid material key, e.g. `'wallCream' | 'roofRed' | …`. */
export type MaterialKey = keyof typeof MATERIAL_LIBRARY;

/** Sky gradient + fog, tuned to the warm afternoon light in the concept art. */
export const ATMOSPHERE = {
  skyTop: 0x5d9fd6,
  skyHorizon: 0xdfe8ea,
  /** Warm bounce light off the ground. */
  groundBounce: 0xa58a62,
  sunColour: 0xfff1d6,
  fogColour: 0xd9e3e5,
} as const;
