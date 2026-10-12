# Ghanaian Campus Life Simulator

A first-person 3D walkable university campus that runs in a browser — including
a modest Android phone — built with **Three.js**, **TypeScript** and **Vite**.

**Phase 1 is a prototype of the campus itself**, not a game yet. You can walk
the entrance, the avenue, the courtyard and the teaching blocks, bump into
things, and read the signs. There is no story, no NPCs, no economy and no save
file; those are later phases, mapped out in [PROJECT_PHASES.md](PROJECT_PHASES.md).

Every building, tree, bench and sign you see is **placeholder geometry**
generated from data files. It is all designed to be thrown away and replaced
with the artist's models and campus map — see
[Artist asset integration](#artist-asset-integration).

---

## Contents

- [Quick start](#quick-start)
- [Controls](#controls)
- [What is in the prototype](#what-is-in-the-prototype)
- [Architecture](#architecture)
- [Editing the campus](#editing-the-campus)
- [Artist asset integration](#artist-asset-integration)
- [Performance notes](#performance-notes)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)

---

## Quick start

Requires **Node.js 20 or newer** (CI uses 22).

```bash
npm install     # install dependencies
npm run dev     # dev server at http://localhost:5173
```

`npm run dev` binds to all interfaces, so you can open the printed network
address on a phone that is on the same Wi-Fi and test touch controls on real
hardware.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type check, then build the production site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally, at the real base path |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run lint` | ESLint over the whole project |
| `npm run verify` | Type check + lint + build. Run this before pushing. |
| `npm run test:smoke` | End-to-end browser smoke test (see [Testing](#testing)) |

> `npm run preview` serves at
> `http://localhost:4173/ghanaian-campus-life-simulator/` — note the
> sub-directory. That is deliberate: it mirrors GitHub Pages exactly, so a
> broken asset path shows up locally rather than after a deploy.

---

## Controls

### Desktop

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrow keys | Walk and strafe |
| Mouse | Look around (requires pointer lock — click **Enter Campus**) |
| `Shift` | Run |
| `E`, `Enter` or `Space` | Read a sign or plaque |
| `Esc` or `P` | Pause / resume |

Pressing `Esc` releases the mouse, so the game pauses rather than leaving you
with a camera that has silently stopped responding.

### Touchscreen (Android)

| Input | Action |
| --- | --- |
| Left thumbstick | Walk and strafe |
| Drag on the right of the screen | Look around |
| **Interact** button | Read a sign or plaque (greyed out when nothing is in range) |
| Pause button, top right | Pause / resume |

The controls swap automatically based on `navigator.maxTouchPoints` and a
`(pointer: coarse)` media query. No user-agent sniffing.

### Pause menu

- **Graphics quality** — Low / Medium / High. Changing it rebuilds the campus
  in place; you keep your position.
- **Look sensitivity** — applies to both mouse and touch.

Both are saved to `localStorage` and survive a reload.

---

## What is in the prototype

- A **gated entrance** with rendered pillars, a kente-banded lintel and a
  boundary wall running the length of the campus.
- A **paved avenue** running north from the gate to the courtyard, lined with
  royal palms, benches and lamp posts.
- A **courtyard** with a flagpole, planters, a directory finger-post and an SRC
  notice board.
- **Seven buildings**, five of them teaching blocks:
  - Independence Great Hall
  - Nkrumah Lecture Block
  - Yaa Asantewaa Science Block
  - Faculty of Engineering
  - Ananse Memorial Library
  - Students' Centre & Chop Bar
  - Porter's Lodge
- **Ghanaian-inspired architecture** throughout: raised plinths, deep shaded
  verandah colonnades with balcony slabs, wide overhanging eaves on steep gable
  and hip roofs in red oxide and zinc, louvred breeze-block screens, whitewashed
  pilasters, green louvre shutters and painted kente bands.
- **Tropical planting**: palms, mango, neem, flamboyant and banana, hand-placed
  along the formal routes and seeded-random in the background belts.
- **Natural daylight** — a high tropical sun, hemisphere bounce off the red
  laterite ground, a gradient sky and distance fog.
- **Eleven readable objects**: the main campus sign, the courtyard directory,
  two notice boards and a plaque on each building.
- A **HUD** that names the part of campus you are standing in.

---

## Architecture

```
src/
├── main.ts                  Bootstrap + fatal-error handling
├── types.ts                 Shared contracts between subsystems
│
├── config/                  ── EDITABLE DATA. No Three.js, no logic. ──
│   ├── campusLayout.ts        Every building, tree, bench, sign and zone
│   ├── palette.ts             Material library and sky/fog colours
│   ├── settings.ts            Player feel, camera, quality presets
│   └── assets.ts              Asset manifest + budgets (empty in Phase 1)
│
├── core/
│   ├── Engine.ts            Renderer, scene, camera, resize, quality switching
│   ├── Game.ts              State machine and the wiring between subsystems
│   └── debug.ts             Opt-in `?debug=1` inspection API
│
├── world/                   ── Reads config/, emits geometry + colliders. ──
│   ├── WorldBuilder.ts        Orchestrator; owns the batching
│   ├── context.ts             The contract every world module implements
│   ├── Ground.ts              Base plane, lawns, walkways, kerbs
│   ├── Entrance.ts            Gate and boundary wall
│   ├── Buildings.ts           Plinths, walls, windows, verandahs, roofs
│   ├── Props.ts               Benches, lamps, planters, flagpole
│   ├── Vegetation.ts          Five tree species + seeded scatter
│   ├── Signage.ts             The interactive signs
│   ├── Lighting.ts            Sun, hemisphere, sky dome, fog
│   └── zones.ts               Position -> HUD place name
│
├── player/PlayerController.ts    Movement, camera, head bob
├── physics/CollisionSystem.ts    Circle vs rotated box/circle resolution
├── interaction/InteractionSystem.ts  Proximity + facing focus selection
│
├── input/
│   ├── InputState.ts        Device-agnostic state both devices write into
│   ├── KeyboardMouseInput.ts  Keys + pointer lock
│   └── TouchInput.ts        Virtual joystick, look drag, interact button
│
├── ui/
│   ├── Hud.ts               Location label, prompt, crosshair, touch layer
│   ├── Overlays.ts          Loading / start / pause / sign read-out
│   ├── controls.ts          Control hints as data
│   ├── dom.ts               DOM helpers (textContent only, never innerHTML)
│   └── styles.css           The entire UI layer
│
└── utils/
    ├── GeometryBatcher.ts   Merges the campus into ~35 draw calls
    ├── MaterialLibrary.ts   One shared material per palette key
    ├── shapes.ts            Box / cylinder / gable / pyramid / blob helpers
    ├── Random.ts            Seeded RNG (mulberry32)
    └── device.ts            Touch detection, quality guess, storage
```

### The rule that keeps it modular

**World modules read data and emit geometry. They never touch the player, the
camera, the UI or each other.**

Each one receives a `WorldBuildContext` — a shape builder plus a sink for
colliders and interactables — and that is its entire world. `Buildings.ts` does
not know the player exists; it registers a footprint and moves on.
`CollisionSystem` does not know what a building is; it sees rotated rectangles.
This is what makes it realistic to delete `Buildings.ts` wholesale in Phase 2
and replace it with a glTF loader.

### Data flow

```
config/campusLayout.ts
        │
        ▼
world/WorldBuilder ──► world modules ──► GeometryBatcher ──► ~35 merged meshes
        │                   │
        │                   ├──► colliders ──► CollisionSystem ──► PlayerController
        │                   └──► interactables ──► InteractionSystem ──► Hud / Overlays
        ▼
   InputState ◄── KeyboardMouseInput / TouchInput
```

---

## Editing the campus

Almost everything you would want to change lives in `src/config/`, in plain
TypeScript objects with no framework in sight.

**Move a building:** edit its `position` in
[`src/config/campusLayout.ts`](src/config/campusLayout.ts). Its mesh, shadow,
collider, plaque and HUD zone all follow.

**Coordinate system:** `+X` east, `+Z` south, `+Y` up. 1 unit = 1 metre. The
campus runs *northwards* (towards `-Z`) from the gate. All rotations in the data
files are in **degrees**.

```ts
{
  id: 'library',
  name: 'Ananse Memorial Library',
  position: [34, -64],      // [x, z] footprint centre
  size: [24, 13, 16],       // [width, wall height, depth] in LOCAL axes
  rotationY: 0,             // degrees; the entrance faces local +Z
  storeys: 3,               // drives the window grid
  walls: 'wallWhitewash',   // keys from config/palette.ts
  roofStyle: 'hip',         // 'gable' | 'hip' | 'flat'
  verandah: 'wrap',         // 'none' | 'front' | 'front-and-back' | 'wrap'
  kenteBand: true,
  plaque: { /* readable text */ },
  model: null,              // set to an asset key to use a real model instead
}
```

**Change a colour:** edit `MATERIAL_LIBRARY` in
[`src/config/palette.ts`](src/config/palette.ts). One entry recolours every
surface using it, campus-wide.

**Change how it feels to walk:** `PLAYER_SETTINGS` and `CAMERA_SETTINGS` in
[`src/config/settings.ts`](src/config/settings.ts).

**Change what a phone gets:** `QUALITY_PRESETS` in the same file.

---

## Artist asset integration

**Concept art** — the campus master plan, building elevations, props, UI and
storyboards — is in **[`art/reference/`](art/reference/README.md)**, with an
index of what each image shows. It sits outside `public/` so it is not
published with the site.

**Game-ready assets** follow the brief in
**[`public/assets/README.md`](public/assets/README.md)**. The short version:

1. Drop the file into `public/assets/models/` (or `textures/`, `audio/`,
   `images/`).
2. Register it in `src/config/assets.ts`.
3. For a building, set `model: '<yourKey>'` on its entry in `campusLayout.ts`.
   The placeholder geometry for that building is skipped; its collider, plaque
   and HUD zone keep working.

Conventions: metres, `+Y` up, entrance facing `-Z`, origin on the ground at the
footprint centre, transforms baked, one material per model where possible.
Budgets: 6,000 triangles per building, 1024 px textures, 12 MB total download.

Always resolve asset paths through `resolveAssetUrl()` — a hard-coded
`/assets/...` breaks under the GitHub Pages sub-directory.

### Replacing the whole campus map

The artist's master plan replaces `src/config/campusLayout.ts`, not the code.
Re-measure the real layout in metres, write the new positions into that file,
and the world regenerates. If the plan is big enough that hand-authoring is
impractical, the next step is a small importer that reads a JSON export and
produces the same shapes — the data types in `campusLayout.ts` are the contract.

---

## Performance notes

The target is a mid-range Android phone at 30+ fps. Three decisions do most of
the work:

1. **Geometry batching.** A naive build of this campus is ~2,200 meshes — every
   window, column, frond and bench slat — which is 2,200 draw calls per frame.
   `GeometryBatcher` merges everything sharing a material into one mesh, taking
   the campus to about **35 draw calls and ~29,000 triangles**.
   The trade-off: batched geometry is static and cannot be moved, hidden or
   recoloured individually. Anything that needs to animate in Phase 2 must be
   added to the scene directly instead.
2. **Pixel-ratio capping.** A 3x-density phone screen renders nine times the
   pixels of a 1x one. The Low preset caps at 1.0, Medium at 1.5, High at 2.0.
3. **Material count.** One shared material per palette key, and
   `MeshLambertMaterial` instead of `MeshStandardMaterial` on the Low preset —
   it skips the physically based lighting maths entirely and looks nearly
   identical on flat-coloured untextured geometry.

Build output is roughly **155 KB gzipped** of JavaScript, with Three.js split
into its own chunk so it caches independently of game code.

---

## Testing

### Automated checks

```bash
npm run verify     # typecheck + lint + production build
```

These are the same checks CI runs on every push, and the Pages deploy will not
publish if any of them fail.

### Browser smoke test

Typecheck and lint cannot tell you that the player stops at a wall or that the
thumbstick moves anybody. `scripts/smoke-test.mjs` drives the real production
build in headless Chromium and asserts on actual game state — 26 checks covering
world generation, movement, collision, interaction, pause/resume, the quality
rebuild, and the touch controls in a phone-sized viewport.

```bash
npm i -D playwright && npx playwright install chromium   # first time only
npm run build
npm run preview &          # must be serving on port 4173
npm run test:smoke
```

Playwright is deliberately not a devDependency — it pulls a browser download
that someone editing a data file does not need.

There is **no unit-test suite in Phase 1**. Adding one is the first item on
[TODO.md](TODO.md).

### Manual test pass

Run `npm run preview` and walk through:

- [ ] Loading bar completes and the start screen appears
- [ ] **Enter Campus** locks the mouse and you can look around
- [ ] `W A S D` walks, `Shift` runs, movement stops dead at a wall
- [ ] You cannot walk through a building, tree, bench, lamp or boundary wall
- [ ] You cannot leave the campus bounds
- [ ] Walking up to the campus sign shows the `E` prompt
- [ ] `E` opens the sign; `E` or the Close button dismisses it
- [ ] `Esc` pauses and releases the mouse; `Esc` or Resume returns you
- [ ] Switching graphics quality rebuilds without losing your position
- [ ] The HUD location label changes as you move between areas
- [ ] On a phone: the thumbstick walks, right-side drag looks, Interact works
- [ ] On a phone: rotating the device re-fits the canvas

### Debug API

Append `?debug=1` to the URL to get `window.__campusDebug`:

```js
__campusDebug.getPlayer()    // { x, z, yawDegrees, speed }
__campusDebug.getStats()     // batches, triangles, colliders, interactables
__campusDebug.getPhase()     // 'loading' | 'ready' | 'playing' | 'paused' | 'reading'
__campusDebug.getFocusId()   // id of the interactable in range, or null
__campusDebug.getZoneName()  // the HUD place name
__campusDebug.teleport(x, z, yawDegrees)
```

`teleport` is the fast way for the artist to stand at an exact coordinate and
compare placeholder placement against the campus map. The API is **not**
attached without the query parameter.

---

## Deployment

Pushing to `main` builds the site and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`. No backend, no database, no paid API, no server.

**A one-time repository setting is required before the first deploy.** Full
instructions, including the private-repository caveat, are in
**[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Known limitations

These are deliberate Phase 1 boundaries, not bugs:

- **The world is flat and movement is 2D.** There is no floor height, no stairs
  and no jumping. Raised verandahs are therefore modelled as solid rather than
  walkable — walking one would put the camera through the slab.
- **No audio.** Silent by design: nothing to download on mobile data and no
  autoplay policy to fight.
- **No NPCs, quests, time of day, inventory or save file.** Phase 2 onwards.
- **Shadows are a single wide cascade** covering the whole campus, so they are
  soft and approximate. Cascaded shadow maps are a later optimisation.
- **Signs show no text in 3D.** The boards are blank; the writing lives in the
  HTML panel you open. Rendering text into the world needs an SDF font atlas.
- **Not verified on physical Android hardware.** See the note in the pull
  request: automated verification ran in headless Chromium with a software
  renderer, including a phone-sized touch viewport, but nobody has yet held a
  real phone and played it.
