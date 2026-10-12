# Asset drop-zone

Everything in `public/` is copied to the site root **verbatim** at build time and
is **not** processed by Vite. Files land at
`https://rhhas-knust.github.io/ghanaian-campus-life-simulator/assets/<folder>/<file>`.

Phase 1 ships **no binary assets at all** — every building, tree, bench and sign
is procedural placeholder geometry. These folders exist so the artist can start
delivering without anybody restructuring the project first.

```
public/assets/
├── models/     glTF 2.0 (.glb preferred) buildings, props, characters
├── textures/   wall / roof / ground maps (.webp or .ktx2)
├── audio/      ambience, footsteps, UI (.ogg with .mp3 fallback)
└── images/     sign artwork, UI icons, the artist's campus map reference
```

The artist's **concept art** (master plan, elevations, UI mock-ups) is not
here — it is in [`art/reference/`](../../art/reference/README.md), outside
`public/`, so it is never deployed.

## How to add an asset

1. **Drop the file** into the right folder above. Use lowercase, hyphenated
   names: `great-hall.glb`, not `Great Hall FINAL v2.glb`.
2. **Register it** in `src/config/assets.ts`, in `MODEL_ASSETS`,
   `TEXTURE_ASSETS`, `AUDIO_ASSETS` or `IMAGE_ASSETS`.
3. **Point the world at it.** For a building, set `model: '<yourKey>'` on its
   entry in `src/config/campusLayout.ts`. The generator then skips the
   placeholder geometry for that building; its collider, plaque and HUD zone
   keep working unchanged.

Always reference assets through `resolveAssetUrl()` from `src/config/assets.ts`,
never with a hard-coded `/assets/...` path — the leading slash breaks the moment
the site is served from a sub-directory, which it is.

## Budgets

Phase 1 targets a mid-range Android phone at 30+ fps. The whole campus is
currently under 30,000 triangles and about 150 KB gzipped of JavaScript, so
there is real headroom — but it is finite.

| Thing | Budget |
| --- | --- |
| Triangles per building | 6,000 |
| Triangles per prop (bench, lamp, sign) | 800 |
| Texture size | 1024 x 1024 max |
| Model format | `.glb` (glTF 2.0), Draco compression welcome |
| Texture format | `.webp`, or `.ktx2` for GPU-compressed |
| Audio format | `.ogg`, with an `.mp3` fallback for older Safari |
| Total download | 12 MB |

These numbers are also in `ASSET_BUDGETS` in `src/config/assets.ts`.

## Model conventions

- **Units:** metres. 1 unit = 1 metre. The player's eye is at y = 1.68.
- **Up axis:** +Y.
- **Facing:** the model's front (its entrance) faces **-Z**. If yours does not,
  set `rotationOffsetY` in the manifest rather than re-exporting.
- **Origin:** on the ground, at the centre of the footprint. Not at the ceiling,
  not at a corner.
- **Scale:** baked. Apply transforms before export.
- **Materials:** one material per model where possible. Every extra material is
  an extra draw call that the geometry batcher cannot merge away.

## Licensing

Only commit assets we have the right to publish — the site is public once Pages
is enabled. Put the source and licence in the manifest entry's `credit` field
for anything that is not original work commissioned for this project.
