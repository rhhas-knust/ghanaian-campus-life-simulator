# AGENTS.md

Working notes for anyone — human or AI — making changes to this repository.
Read this before touching code.

## What this project is

A browser-based first-person 3D Ghanaian university campus: Three.js +
TypeScript + Vite, deployed as a static site to GitHub Pages.

**Phase 1 is a walkable prototype, not a game.** Do not start Phase 2 work
unless you have been asked to. The phases are in [PROJECT_PHASES.md](PROJECT_PHASES.md).

## Hard constraints

These are not preferences. Breaking one breaks the project.

1. **No backend, no database, no paid API, no server.** The deliverable is
   static files on GitHub Pages. If a feature needs a server, it is out of scope
   — say so rather than adding one.
2. **`base` in `vite.config.ts` must match the repository name**
   (`/ghanaian-campus-life-simulator/`). Runtime asset URLs must go through
   `resolveAssetUrl()`. A hard-coded `/assets/...` works in dev and 404s in
   production.
3. **It has to run on a modest Android phone.** Draw calls, pixel ratio and
   material count are the budget. Before adding anything that renders per-frame,
   know what it costs.
4. **`npm run verify` must pass** (typecheck + lint + build). CI runs the same
   checks and the Pages deploy will not publish if they fail.
5. **Never claim a device test that did not happen.** Headless-browser
   verification is not Android testing. Say which you did.

## The architectural rule

**World modules read data and emit geometry. They never touch the player, the
camera, the UI, or each other.**

A world module gets a `WorldBuildContext` — a `ShapeBuilder` plus a sink for
colliders and interactables — and that is its whole world. If you find yourself
importing `PlayerController` into `Buildings.ts`, stop: the design has gone
wrong.

Likewise:

- `CollisionSystem` knows about rotated rectangles and circles. It does not know
  what a building is.
- `InteractionSystem` knows about positions and radii. It does not know what a
  sign is.
- `Hud` and `Overlays` are told what to display. They never read game state.

This is what makes it realistic to delete `Buildings.ts` in Phase 2 and replace
it with a glTF loader.

## Where to make a change

| You want to... | Edit |
| --- | --- |
| Move / add / restyle a building, tree, bench, sign, zone | `src/config/campusLayout.ts` |
| Change a colour or add a material | `src/config/palette.ts` |
| Change walk speed, camera feel, a quality preset | `src/config/settings.ts` |
| Register an artist asset | `src/config/assets.ts` |
| Change how buildings are *generated* from their data | `src/world/Buildings.ts` |
| Change collision behaviour | `src/physics/CollisionSystem.ts` |
| Change the HUD or a menu | `src/ui/` and `index.html` |
| Change the CI / deploy pipeline | `.github/workflows/deploy.yml` |

**Prefer editing data over editing code.** If adding a feature means a new kind
of object, add a new typed array to `campusLayout.ts` and a new world module
that consumes it, rather than special-casing inside an existing one.

## Conventions

- **TypeScript is strict**, with `noUncheckedIndexedAccess` and
  `verbatimModuleSyntax` on. Type-only imports need `import type`.
- **No `any`. No non-null `!`.** If a field cannot be assigned in the
  constructor, give it a real placeholder, as `Game` does.
- **Units are metres. Rotations in data files are DEGREES**, converted to
  radians at the boundary (`degToRad`). Colliders store radians.
- **Coordinates:** `+X` east, `+Z` south, `+Y` up. The campus runs north
  (towards `-Z`) from the gate.
- **DOM text uses `textContent`, never `innerHTML`.**
- **`console.log` is a lint error.** `console.warn` and `console.error` are
  allowed; anything informational goes behind `import.meta.env.DEV` or the
  debug API.
- **Comments explain *why*, not *what*.** Say what the trade-off was, what the
  constraint is, or what will break if someone changes it. Do not narrate the
  code.

## Performance rules

- **Static geometry goes through `GeometryBatcher`.** Never `scene.add()` a
  one-off mesh for scenery. The campus is ~2,200 pieces in ~35 draw calls; one
  careless `scene.add` in a loop undoes that.
- **Anything that must animate cannot be batched.** Batched geometry is merged
  and frozen. Phase 2's moving things go into the scene directly, and should be
  instanced where there are many of them.
- **One material per palette key.** Adding a material is adding a draw call.
- **No per-frame DOM writes.** `Hud` compares against the last value and only
  writes when it actually changed. Keep that pattern.
- **Seeded randomness only** (`SeededRandom`). `Math.random()` in world
  generation means the campus differs between devices and the artist's reference
  screenshots stop matching.

## Before you push

```bash
npm run verify
npm run preview &
npm run test:smoke   # needs playwright; see README
# then actually walk around
```

If you changed anything visual, look at it. If you changed collision, walk into
a wall. The `?debug=1` API exists so you can assert on real state:

```js
__campusDebug.getPlayer()   // { x, z, yawDegrees, speed }
__campusDebug.getStats()    // batches, triangles, colliders, interactables
__campusDebug.teleport(x, z, yawDegrees)
```

Watch `getStats().batches`. If it jumps, something stopped batching.

## Things that have already bitten us

- **The unit cylinder has radius 1, i.e. diameter 2.** Scaling by `radius * 2`
  makes it twice as fat as asked. `ShapeBuilder.cylinder` handles this; if you
  add a primitive, check the helper's scale factor against the base geometry.
- **A solid trim box in front of a window pane hides the pane.** Geometry
  submitted later does not win — depth does. Offset things that must be visible.
- **Scatter zones silently under-fill.** Rejection sampling gives up after a
  bounded number of attempts. If a zone's `count` exceeds what its area and
  `clearance` allow, the quality density multiplier stops having a visible
  effect. Check `getStats().submissions` across presets.
- **`Esc` both exits pointer lock and is our pause key.** `KeyboardMouseInput`
  distinguishes an intentional release from an unexpected one; do not simplify
  that away or opening a sign will also pause the game.

## Commit and PR

- Conventional-ish messages: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Say what you verified and how. If you could not verify something — real
  hardware, a device you do not have — say that explicitly.
- Keep `README.md`, `DEPLOYMENT.md`, `PROJECT_PHASES.md` and `TODO.md` current
  in the same change, not afterwards.
