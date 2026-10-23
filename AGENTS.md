# AGENTS.md

Working notes for anyone — human or AI — making changes to this repository.
Read this before touching code.

## What this project is

A browser-based first-person 3D Ghanaian university campus: Three.js +
TypeScript + Vite, deployed as a static site to GitHub Pages.

**Phase 1 is a walkable campus; Phase 2 has started with the story only** —
game state, dialogue, the arrival cinematic, character creation, missions M01
and M02, and the interior system with two interiors (Block A's second floor,
the Porter's Lodge), because the owner asked for them (GAME_DESIGN.md §12,
stages A–C and C+). Do not start Mission 3, more interiors, or the rest of
Phase 2 and later work (glTF loading, crowds, life systems, a backend) unless
you have been asked to. The
phases are in [PROJECT_PHASES.md](PROJECT_PHASES.md).

**The art lives in [`GAME_ART/`](GAME_ART/README.md). Read
[`GAME_ART/ART_DIRECTION.md`](GAME_ART/ART_DIRECTION.md) before changing
anything visual.** The layout is traced from the master plan; the buildings,
props and HUD follow the elevation sheets and UI mock-ups.

## Hard constraints

These are not preferences. Breaking one breaks the project.

1. **No backend, no database, no paid API, no server.** The deliverable is
   static files on GitHub Pages. If a feature needs a server, it is out of scope
   — say so rather than adding one.
2. **`base` in `vite.config.ts` must match the repository name**
   (`/ghanaian-campus-life-simulator/`). Runtime asset URLs must go through
   `resolveAssetUrl()` — including CSS backgrounds, which is why the title
   background is set from JS. A hard-coded `/assets/...` works in dev and 404s
   in production.
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

A world module gets a `WorldBuildContext` — a `ShapeBuilder`, a sink for
colliders and interactables, and the `SignAtlas` for lettering — and that is
its whole world. If you find yourself importing `PlayerController` into
`Buildings.ts`, stop: the design has gone wrong.

Likewise:

- `CollisionSystem` knows about rotated rectangles and circles. It does not know
  what a building is.
- `InteractionSystem` knows about positions and radii. It does not know what a
  sign is.
- `Hud` and `Overlays` are told what to display. They never read game state.
  (`Minimap` and the map overlay read the *layout data*, which is fine: it is
  configuration, not state.)
- `PlayerController` owns the body. `CameraRig` frames it and `Avatar` draws
  it; the player knows nothing about either.
- **Interiors are world modules too.** `src/world/interiors/` builds one
  interior from `src/config/interiors.ts` into batches, colliders and
  interactables, and knows nothing about the story. `Game` owns the
  location: it builds the interior on the way in, disposes it on the way out,
  and swaps the collision and interaction sets with `replace()` — it never
  creates a new `PlayerController`, `CameraRig` or `CollisionSystem`.
- **`src/story/` is data and logic only: no Three.js, no DOM.** A mission step
  is a flag; the director works out the objective from the flags; the dialogue
  runner applies effects to `StoryState`. `Game.ts` is the only place the story
  meets the world (interactions, HUD, beacon, save). `DialogueBox` and
  `PhoneMenu` are told what to show, like the HUD.

This is what makes it realistic to delete `Buildings.ts` in Phase 2 and replace
it with a glTF loader.

## Where to make a change

| You want to... | Edit |
| --- | --- |
| Move / add / restyle a building, tree, bench, sign, zone | `src/config/campusLayout.ts` (master-plan pixels) |
| Add another H-plan building | `campusLayout.ts` — a new entry using `hPlan(...)`; add its id to `ADDED_SINCE_MASTER_PLAN` if it is not on the plan image |
| Change a colour or add a material | `src/config/palette.ts` |
| Change walking, camera, touch-look or quality presets | `src/config/settings.ts` |
| Register a runtime asset (model, texture, image) | `src/config/assets.ts` + `public/assets/` |
| Write or change a conversation | `src/story/data/dialogue/*.json` — never put dialogue in TypeScript |
| Change who stands where, or which conversation they start | `src/story/data/cast.ts` |
| Add or change a mission step | `src/story/data/missions.ts` (a step = a flag) |
| Add a phone message thread | `src/story/data/messages.json` |
| Change the arrival cinematic | `src/story/data/opening.ts` (shots in master-plan pixels) |
| Add or change an interior, or the door into it | `src/config/interiors.ts` (local metres; `ENTRANCES` in plan pixels) |
| Add a piece of furniture | `PropKind` in `interiors.ts` + a case in `src/world/interiors/furniture.ts` |
| Add something to inspect (bed, wardrobe, cabinet) | `src/story/data/places.ts` |
| Look up the concept art | `GAME_ART/` — reference only, never shipped |
| Check how a planned system, character or mission should work | `GAME_DESIGN.md`, `CHARACTER_BIBLE.md`, `STORYLINE.md` — designs, not descriptions of current code |
| Change how buildings are *generated* | `src/world/Buildings.ts` |
| Change collision behaviour | `src/physics/CollisionSystem.ts` |
| Change first/third-person framing | `src/player/CameraRig.ts` |
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
- **Coordinates:** layout data is in **master-plan pixels** (plan scaled to
  2000 px wide); convert with `planPoint` / `planRect` / `planLength`, never by
  hand. World space is metres, `+X` east, `+Z` south, `+Y` up; the gate is on
  the south edge.
- **DOM text uses `textContent`, never `innerHTML`.**
- **`console.log` is a lint error.** `console.warn` and `console.error` are
  allowed; anything informational goes behind `import.meta.env.DEV` or the
  debug API.
- **Comments explain *why*, not *what*.** Say what the trade-off was, what the
  constraint is, or what will break if someone changes it. Do not narrate the
  code.

## Performance rules

- **Static geometry goes through `GeometryBatcher`.** Never `scene.add()` a
  one-off mesh for scenery. The campus is ~5,600 pieces in ~38 draw calls; one
  careless `scene.add` in a loop undoes that. The avatar is the one deliberate
  exception, because it moves.
- **Sign lettering goes through `SignAtlas`.** A `CanvasTexture` per sign is a
  draw call per sign. Register the text in `WorldBuilder.collectLabels()` (or
  the data it reads) and draw it with `shapes.label`.
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
npm run test:smoke   # 90 checks; needs playwright, see README
# then actually walk around — in both camera modes
```

If you changed anything visual, look at it. If you changed collision, walk into
a wall. The `?debug=1` API exists so you can assert on real state:

```js
__campusDebug.getPlayer()   // { x, z, yawDegrees, pitch, speed }
__campusDebug.getCamera()   // { mode, x, y, z }
__campusDebug.getStats()    // batches, triangles, colliders, interactables
__campusDebug.getStory()    // mission, objective, step, flags, relationships
__campusDebug.getLocation() // 'campus' or an interior id
__campusDebug.setFlags([])  // jump to a story state without replaying it
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
- **The sky dome must follow the camera.** Centred on the origin, its far side
  dropped beyond the camera's far plane once the campus grew to 272 m, and
  rendered as a black wedge in the sky. `Game.renderFrame` moves it every frame.
- **Touch look drifted towards the sky.** A sideways thumb swipe arcs upwards,
  and full-strength vertical look turned that arc into pitch. The axis lock,
  halved vertical sensitivity, tighter pitch limits and auto-level in
  `settings.ts` / `TouchInput.ts` / `PlayerController.ts` fix it; the smoke test
  guards it. Do not "simplify" any of them away.
- **SwiftShader runs the game at ~9 fps**, and the game caps simulated time
  per frame, so a key held for one second in a headless test moves the player
  much less than one second's worth. Hold keys longer in tests rather than
  loosening the frame cap. For the same reason, poll for a phase or a focus
  (`waitForPhase`, `waitForFocus` in the smoke test) instead of sleeping a
  fixed few hundred milliseconds — and leave the desktop page paused before
  the touch checks, or the two pages share the CPU.
- **The keyboard handler swallows W, E, Space and Tab.** It skips text
  inputs (`isTextEntry` in `KeyboardMouseInput.ts`); without that, nobody
  could type a name with a W or an E in it in character creation.
- **Interior lettering has its own material key** (`interiorSignText`).
  Building an interior registers a fresh atlas material under it; reusing
  `signText` would dispose the campus atlas and blank every campus sign.
- **Story points mix units on purpose**: a cast post, place or mission target
  with no `location` is in campus master-plan pixels; one with a `location`
  is in that interior's local metres. Convert with `locationPoint`, never by
  hand.
- **Indoors there is no sun.** Shadows, the sky dome and campus lamp lights
  are switched off (`setIndoorLighting`); the third-person boom is capped
  under the ceiling (`CameraRig.setCeiling`). Forget either and rooms are
  dark or the camera pokes through the roof.
- **Steps complete from flags, so gate the things that set them.** A step's
  conversation or place is conditioned on the previous step's flag
  (`talks`/`readings` `when`), otherwise exploring early completes steps out
  of order.
- **Dialogue placeholder figures are one merged mesh each.** Do not build NPCs
  out of separate meshes like the avatar: four characters would cost more draw
  calls than half the campus.

## Commit and PR

- Conventional-ish messages: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
- Say what you verified and how. If you could not verify something — real
  hardware, a device you do not have — say that explicitly.
- Keep `README.md`, `DEPLOYMENT.md`, `PROJECT_PHASES.md`, `TODO.md` and
  `GAME_ART/ART_DIRECTION.md` current in the same change, not afterwards.
- Open a pull request; never merge without the owner's say-so.
