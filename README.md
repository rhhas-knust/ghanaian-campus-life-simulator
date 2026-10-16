# Campus Life: The Journey

> *Your campus. Your choices. Your story.*

A 3D Ghanaian university campus you can walk around in a browser — on a
desktop with keyboard and mouse, or on an Android phone with touch controls —
built with **Three.js**, **TypeScript** and **Vite**, and published on
**GitHub Pages**.

**Live:** https://rhhas-knust.github.io/ghanaian-campus-life-simulator/

Set at **UCIS University** (*Until Christ is Seen*), a fictional, church-founded
Ghanaian university. (The repository
keeps its original name, `ghanaian-campus-life-simulator`, so the site URL does
not change.)

**Phase 1** is the campus itself: walk in through the security gate, explore
the courtyard, lecture halls, library, student centre, cafeteria, hostels and
sports fields, in first or third person, and read the signs.

**Phase 2 has started with the story opening** (roadmap stages A–C): **New
Story** plays a skippable arrival cinematic, then character creation, then the
first mission, **M01 "Akwaaba"** — sign in at the gate, collect your student ID,
meet your roommate Nii and join the hostel group chat. Conversations have
choices, the phone holds your objectives and messages, and progress is saved
on the device. After M01 the campus is free to explore; Mission 2 is not built
yet. Buildings cannot be entered yet either — interiors are a later stage.

**Design documents** for the full game — systems, cast and story; most of it
not built yet: [GAME_DESIGN.md](GAME_DESIGN.md),
[CHARACTER_BIBLE.md](CHARACTER_BIBLE.md), [STORYLINE.md](STORYLINE.md).
What is built and what is planned: [PROJECT_PHASES.md](PROJECT_PHASES.md).

---

## Contents

- [Quick start](#quick-start)
- [Controls](#controls)
- [What is in Phase 1](#what-is-in-phase-1)
- [The story so far](#the-story-so-far)
- [Art and how it is used](#art-and-how-it-is-used)
- [Architecture](#architecture)
- [Editing the campus](#editing-the-campus)
- [Performance](#performance)
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

`npm run dev` listens on all network interfaces, so a phone on the same Wi-Fi
can open the network address it prints — the quickest way to try the touch
controls on real hardware.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type check, then build the production site into `dist/` |
| `npm run preview` | Serve the built `dist/` locally, at the real base path |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm run lint` | ESLint over the whole project |
| `npm run verify` | Type check + lint + build. Run this before pushing. |
| `npm run test:smoke` | End-to-end browser test (see [Testing](#testing)) |

> `npm run preview` serves at
> `http://localhost:4173/ghanaian-campus-life-simulator/` — note the
> sub-directory. That mirrors GitHub Pages exactly, so a broken asset path
> shows up locally rather than after a deploy.

---

## Controls

### Android / touchscreen

| Control | Action |
| --- | --- |
| Left thumbstick | Walk. Push gently to stroll, fully to walk at full speed. |
| Drag on the right half of the screen | Look around |
| **INTERACT** button (bottom right) | Talk to someone, or read a sign or plaque — lights up when one is in range |
| Tap the conversation box | Next line; tap a reply to choose it |
| Phone button (top left, next to pause) | Objectives, messages and your profile |
| Camera button (under the minimap) | Switch between first-person and third-person view |
| Pause button (top left) | Pause menu: campus map, view, settings |

Tapping **New Story** or **Continue Story** on a phone also switches to
fullscreen and, where the browser allows it, locks to landscape.

### Desktop

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` / arrow keys | Walk and strafe |
| Mouse | Look around (the mouse is captured once you start playing) |
| `Shift` | Run |
| `E`, `Enter` or `Space` | Talk, read a sign or plaque, or go to the next line of a conversation |
| `1` – `4` | Pick a reply in a conversation |
| `Tab` | Open / close the phone |
| `V` or `C` | Switch first-person / third-person view |
| `Esc` or `P` | Pause / resume (and close the map or phone; skips the cinematic) |

### Pause menu

- **Resume**
- **Campus Map** — the artist's master plan, with a "you are here" marker.
- **View** — first or third person.
- **Settings**: graphics quality (Low / Medium / High, rebuilt in place, you
  keep your position), look sensitivity, **invert up/down look**, **level
  the view when walking**, and **Start a new story** (asks twice).

All settings are saved on the device and survive a reload.

### About the camera-swipe fix

Players of the first build reported that any swipe on a phone ended with the
view pointing at the sky. The cause: a thumb sweeping sideways across a screen
moves in an arc, usually upwards, and that arc was being read as "look up".
It is fixed four ways, all tunable in `src/config/settings.ts`:

1. **Axis lock** — a drag that is mostly sideways keeps only 15% of its
   vertical movement.
2. **Softer vertical** — up/down look is half as sensitive as left/right.
3. **Tighter limits** — about +50° up and -57° down, not ±88°.
4. **Auto-level** — after you stop dragging and start walking, the view eases
   back to the horizon. On by default on touch, off on desktop; toggle it in
   Settings.

The automated test checks the fix: a 150 px sideways swipe with a 40 px upward
arc now changes pitch by 0.013 rad (it was ~0.17), while a deliberate 80 px
vertical drag still looks up.

---

## What is in Phase 1

Traced from the master plan in `GAME_ART/campus-map/`:

- **Main gate** — security booth on a traffic island with raised red-and-white
  barriers, a porter's lodge, and the **AKWAABA welcome board** (the
  interactive campus sign).
- **Central courtyard** — a circular plaza with a monument, shade trees,
  benches and lamps, ringed by a road, with a **timber signpost** pointing the
  way to each area.
- **Four H-plan buildings** — the **Library**, the **Student Centre**, the
  **Administration Block** and the **Faculty of Engineering**.
- **Lecture Halls 1–3** — ring-plan and bar blocks linked by first-floor
  bridges.
- **Cafeteria** with kiosks and an outdoor patio under umbrellas.
- **Hastech Hostels, Blocks A and B** — courtyard blocks entered through a
  signed gateway.
- **Football field and basketball court**, car parks with parked cars, a
  perimeter fence, roads, footpaths, hedges and dozens of trees (coconut palm, fan
  palm, fruiting mango, neem, flamboyant).
- **Fourteen readable objects** — the welcome board, the signpost, the SRC
  notice board and a plaque at every major building.
- **Collision** with every building, wall, tree, post, bench and parked car.
- **First- and third-person cameras.** Third person shows a student avatar
  (grey shirt, jeans, backpack) with a walk cycle; the camera pulls in rather
  than passing through walls.
- **HUD** after the gameplay HUD reference: pause button, location pill, round
  minimap with building labels, camera button, interaction prompt, joystick
  and INTERACT button.
- Tropical afternoon daylight with a gradient sky, distance fog, and shadows
  that follow the player.

---

## The story so far

Phase 2, roadmap stages A–C of [GAME_DESIGN.md](GAME_DESIGN.md) §12. Story
text follows [STORYLINE.md](STORYLINE.md) §2.

- **Title screen.** **New Story**, or **Continue Story** when there is a save
  (with a second button to start over, which asks twice).
- **M00 "Arrival"** — a ~45-second camera flight over the real campus with
  captions: the admission notification, the gate, the courtyard, the hostels,
  Mr. Narh watching the football field, and the title card. **Skip** is
  on screen from the first frame.
- **Character creation** — name (with an Akan day-name suggestion), how you
  are addressed (he / she / they), programme (Engineering, Computer Science,
  Business Administration, Communication Studies, Architecture) and home.
  Appearance waits for the rigged 3D characters (stage D).
- **M01 "Akwaaba"**, seven steps: sign in with **Uncle Bright** at the
  porter's lodge → read the AKWAABA board → check the courtyard signpost →
  collect your student ID from **Mrs. Agyeman** at the Administration Block →
  meet **Nii** at the Block A gateway → read the Block A group chat on your
  phone → go up to room A-214 and sleep. Day one ends with something buzzing
  under the floor.
- **Conversations** are data — one JSON file each in
  `src/story/data/dialogue/` — with 2–4 replies, conditions (some lines only
  exist for one programme) and effects on flags, relationships and
  reputation. Text only; no voice acting.
- **Objectives** on a card under the pause button, as a gold marker on the
  minimap and the campus map, and as a gold diamond floating over the target.
- **The phone**: the mission checklist, message threads (admissions, Mum, the
  Block A group chat) and a profile with your reputation and the people you
  have met.
- **Saving**: automatic, in the browser's local storage, after every
  conversation, mission step, sleep and pause. There is one save slot per
  browser; clearing site data starts again.
- **Placeholder characters**: simple standing figures, one draw call each,
  until the rigged models exist.

---

## Art and how it is used

The artist's concept art is in **[`GAME_ART/`](GAME_ART/README.md)**, with the
rules for using it in **[`GAME_ART/ART_DIRECTION.md`](GAME_ART/ART_DIRECTION.md)**.

**Why the art is not loaded as 3D models.** The images are 2D renders — several
views per sheet on a white background, with perspective and lighting baked in.
A game needs 3D meshes it can light, collide with and walk around, so a JPEG of
a building cannot become a building. They are used three ways instead:

1. **At runtime:** the master plan is the in-game **campus map**, and a
   storyboard frame is the **title-screen background** (downscaled WebP,
   ~200 KB together).
2. **As data:** the layout file is written in the master plan's own pixel
   coordinates, so the 3D world and the map line up exactly.
3. **As a style guide:** the procedural buildings, props and HUD follow the
   elevation sheets, props sheet and UI mock-ups — cream render, red hip roofs,
   green balustrades, stair towers, signed entrance canopies.

**To get real 3D buildings**, each elevation sheet needs to be modelled (in
Blender, or started with an image-to-3D tool and cleaned up) and exported as
`.glb`. The hand-off — scale, orientation, budgets, where files go — is in
[`public/assets/README.md`](public/assets/README.md). Loading those models is
a Phase 2 task; every building already has a `model` field waiting for it.

---

## Architecture

```
src/
├── main.ts                  Bootstrap, gesture blocking, fatal-error message
├── types.ts                 Shared contracts between subsystems
│
├── config/                  ── EDITABLE DATA. No Three.js, no game logic. ──
│   ├── campusLayout.ts        The whole campus, in master-plan pixels
│   ├── palette.ts             Material colours (from GAME_ART)
│   ├── settings.ts            Movement, camera, touch-look, quality presets
│   └── assets.ts              Runtime asset manifest + budgets
│
├── core/
│   ├── Engine.ts            Renderer, scene, camera, resize, quality switching
│   ├── Game.ts              State machine and the wiring between subsystems
│   └── debug.ts             Opt-in `?debug=1` inspection API
│
├── story/                   ── Story data and logic. No Three.js, no DOM. ──
│   ├── data/
│   │   ├── dialogue/*.json    One conversation per file
│   │   ├── messages.json      Phone message threads
│   │   ├── cast.ts            Who stands where, and what they say
│   │   ├── missions.ts        Mission steps, as flags to set
│   │   ├── opening.ts         The arrival cinematic's camera shots
│   │   └── places.ts          Story places (the stairs to A-214), story cards
│   ├── StoryState.ts          Flags, relationships, reputation, clock, save format
│   ├── StoryDirector.ts       Current objective, worked out from the flags
│   ├── dialogue.ts            JSON validation and the dialogue runner
│   ├── messages.ts            Phone threads
│   ├── save.ts                The one localStorage save slot
│   └── types.ts               Programmes, homes, conditions, effects
│
├── actors/                  ── Story things in the 3D world. ──
│   ├── NpcFigures.ts          Placeholder characters, one draw call each
│   ├── ObjectiveBeacon.ts     The floating objective marker
│   └── storyPlacements.ts     Cast + places -> interactables and colliders
│
├── world/                   ── Reads config/, emits geometry + colliders. ──
│   ├── WorldBuilder.ts        Orchestrator; owns batching and the sign atlas
│   ├── context.ts             The contract every world module implements
│   ├── Ground.ts              Lawn, roads, paths, car parks, sports pitches
│   ├── Entrance.ts            Perimeter fence and gate barriers
│   ├── Buildings.ts           Wings, windows, verandahs, stairs, roofs, entrances
│   ├── Props.ts               Monument, benches, lamps, bins, bollards, umbrellas
│   ├── Vegetation.ts          Five tree species, seeded scatter, hedges
│   ├── Signage.ts             Welcome board, signpost, notice board
│   ├── SignAtlas.ts           All sign lettering in one texture
│   ├── Lighting.ts            Sun, sky dome, fog, player-following shadows
│   └── zones.ts               Position -> HUD place name
│
├── player/
│   ├── PlayerController.ts  Body: position, look, velocity, auto-level
│   ├── CameraRig.ts         First/third-person framing, wall avoidance
│   ├── CinematicCamera.ts   Camera flights for the arrival cinematic
│   └── Avatar.ts            Third-person student model and walk cycle
├── physics/CollisionSystem.ts       Circle vs rotated box/circle
├── interaction/InteractionSystem.ts Proximity + facing focus selection
│
├── input/
│   ├── InputState.ts        Device-agnostic state both devices write into
│   ├── KeyboardMouseInput.ts  Keys + pointer lock
│   └── TouchInput.ts        Joystick, look drag (with the swipe fix), interact
│
├── ui/
│   ├── Hud.ts               Pause, location pill, camera button, prompt, hints
│   ├── Minimap.ts           Round minimap drawn from the layout data
│   ├── Overlays.ts          Loading / start / pause / map / sign reader
│   ├── CinematicOverlay.ts  Captions, title card and Skip
│   ├── CharacterCreation.ts Name, address, programme, home
│   ├── DialogueBox.ts       Speaker, line and replies
│   ├── PhoneMenu.ts         Objectives, messages, profile
│   ├── controls.ts          Control hints as data
│   ├── dom.ts               DOM helpers (textContent only, never innerHTML)
│   └── styles.css           The whole UI layer
│
└── utils/
    ├── GeometryBatcher.ts   Merges the campus into ~38 draw calls
    ├── MaterialLibrary.ts   One shared material per palette key
    ├── shapes.ts            Box, cylinder, disc, hip roof, gable, label, blob
    ├── Random.ts            Seeded RNG (mulberry32)
    └── device.ts            Touch detection, quality guess, storage
```

### The rule that keeps it modular

**World modules read data and emit geometry. They never touch the player, the
camera, the UI or each other.** Each gets a `WorldBuildContext` — a shape
builder, a sink for colliders and interactables, and the sign atlas — and that
is its whole world. `CollisionSystem` sees rectangles and circles, not
buildings. `CameraRig` reads the player; the player knows nothing about the
camera. That is what lets the camera mode change without movement changing,
and what will let `Buildings.ts` be swapped for a glTF loader in Phase 2.

The story follows the same rule. `src/story/` is plain data and logic: it
never touches Three.js or the DOM. A mission step is just a flag to set, so the
mission code does not know what a sign or a phone is. `Game.ts` is the one
place where the story meets the world: an interaction becomes a conversation
or a flag, and every story change is pushed out to the HUD, the beacon and the
save.

### Editing the story

- **A conversation:** add or edit a JSON file in `src/story/data/dialogue/`.
  Nodes have a `speaker` (a cast id, or `player`), `text`, and then `next`,
  `choices` or neither (the conversation ends). `{name}`, `{programme}` and
  `{home}` are filled in. Effects: `{ "type": "flag", "flag": "…" }`,
  `{ "type": "relationship", "who": "nii", "delta": 5 }`,
  `{ "type": "reputation", "axis": "integrity", "delta": -10 }`. A choice can
  carry `"if": { "flag": "…", "notFlag": "…", "programme": "…" }` and
  `"major": true`. Files are checked when the game starts; a broken link
  names the file and node.
- **Who says it:** `talks` in `src/story/data/cast.ts` — the first entry
  whose condition holds is the conversation that starts.
- **A mission step:** `src/story/data/missions.ts`. A step is done when its
  flag is set; reading anything sets `seen:<interactable id>`.
- **A phone message:** `src/story/data/messages.json`.

---

## Editing the campus

Almost everything lives in **`src/config/campusLayout.ts`**, in plain data,
**in the master plan's own pixel coordinates** (measured with the plan scaled
to 2000 px wide). Open `GAME_ART/campus-map/campus_masterplan.jpeg`, read the
pixels, type them in.

```ts
// An H-plan building: bounding box, upright width, crossbar position.
{
  id: 'library',
  name: 'Library',
  wings: hPlan([275, 435, 497, 725], 70, [548, 617]),
  storeys: 3,
  height: 11,
  entrance: { at: [497, 582], facing: 'east' },
  nameBoard: 'LIBRARY',
  plaque: { /* readable text */ },
  model: null, // set to an asset key to use a real model
}
```

- **Add another H building:** copy an entry, give it a new id and call
  `hPlan(boundingBox, uprightWidth, [crossbarTop, crossbarBottom])`. The
  minimap, colliders, plaque and name board all follow automatically.
- **Any other shape:** list its `wings` as rectangles. Faces where wings touch
  are detected and left plain.
- **Colours:** `src/config/palette.ts`.
- **Walking, camera and touch feel:** `src/config/settings.ts`.

Conversion: world x = (px − 1000) × 0.15, world z = (py − 558) × 0.15, in
metres; +Z is south.

---

## Performance

Target: a mid-range Android phone at 30+ fps.

| | High / Medium | Low |
| --- | --- | --- |
| Draw calls (campus) | ~38 | ~38 |
| Draw calls (story characters, objective marker) | +4 | +4 |
| Triangles | ~70,000 | ~46,000 |
| Pixel ratio cap | 2.0 / 1.5 | 1.0 |
| Shadows | yes, following the player | off |
| Lighting model | physically based | Lambert |

How:

1. **Geometry batching.** The campus is ~5,600 pieces — every window, column,
   frond and slat. `GeometryBatcher` merges everything sharing a material into
   one mesh, so it draws in about 38 calls.
2. **One texture for all sign lettering.** Every name board and signpost arm
   is a quad pointing into a single generated texture, so lettering costs one
   draw call in total.
3. **Shadows follow the player** instead of covering the whole 272 m campus,
   so they stay sharp near you at a fixed cost.
4. **Pixel-ratio capping** — a 3x-density phone screen would otherwise render
   nine times the pixels.
5. **Story characters are one mesh each.** A placeholder figure is merged
   into a single vertex-coloured mesh sharing one material, instead of the
   dozen meshes the player's avatar uses.

Download: ~180 KB of gzipped JavaScript (Three.js split into its own cacheable
chunk) plus a 68 KB title image. The 140 KB campus map image only downloads the
first time the map is opened.

---

## Testing

### Automated checks

```bash
npm run verify     # typecheck + lint + production build
```

CI runs the same checks, and the Pages deploy does not publish if any fail.

### Browser smoke test

`scripts/smoke-test.mjs` drives the real production build in headless
Chromium and asserts on game state — **62 checks**: world generation, the
arrival cinematic and Skip, character creation, walking, collision at the
Library, reading the campus sign, a full conversation with Uncle Bright
(choices, relationship change, mission progress), the phone, the save and
**Continue**, both camera modes and third-person wall avoidance, pause, the
campus map, the quality rebuild, and on a phone-sized touch screen the story
start, the joystick, the swipe fix, vertical look and the camera button.

```bash
npm i -D playwright && npx playwright install chromium   # first time only
npm run build
npm run preview &          # must be serving on port 4173
npm run test:smoke
```

Playwright is not a devDependency on purpose: it downloads a browser that
someone editing a data file does not need.

**This is not device testing.** The smoke test uses a software renderer and
synthetic touch events. It proves the logic; it cannot tell you how the game
feels or performs on a real phone.

### Manual test pass

- [ ] Loading bar completes; the start screen shows the courtyard art
- [ ] **New Story** plays the cinematic (fullscreen + landscape on a phone);
      **Skip** works
- [ ] Character creation: the name box takes typing on a phone keyboard
- [ ] Play M01 to the end: Uncle Bright, the board, the signpost, Mrs.
      Agyeman, Nii, the group chat, sleeping in A-214
- [ ] Reload: **Continue Story** puts you back where you were
- [ ] Walk in through the gate; the AKWAABA board shows a prompt
- [ ] You cannot walk through buildings, the fence, trees, posts or cars
- [ ] The location pill and minimap update as you move
- [ ] The camera button / `V` switches views; in third person the camera
      does not go inside walls
- [ ] Swiping sideways on a phone does not tip the view at the sky
- [ ] Pause → Campus Map shows a marker where you are
- [ ] Changing graphics quality keeps your position

### Debug API

Add `?debug=1` to the URL to get `window.__campusDebug`:

```js
__campusDebug.getPlayer()    // { x, z, yawDegrees, pitch, speed }
__campusDebug.getCamera()    // { mode, x, y, z }
__campusDebug.getStats()     // batches, triangles, colliders, interactables
__campusDebug.getPhase()     // 'loading' | 'ready' | 'cinematic' | 'creating' | 'playing'
                             // | 'paused' | 'reading' | 'dialogue' | 'phone'
__campusDebug.getStory()     // name, mission, objective, step, day, clock, flags, relationships
__campusDebug.getFocusId()   // id of the interactable in range, or null
__campusDebug.getZoneName()  // the HUD place name
__campusDebug.teleport(x, z, yawDegrees)
```

---

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`. No backend, no database, no paid service. Setup
and troubleshooting: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

---

## Known limitations

Deliberate Phase 1 boundaries:

- **The world is flat and movement is 2D** — no stairs, no climbing onto
  verandahs (they are inside the building colliders), no interiors.
- **Buildings are procedural placeholders** that follow the art; real models
  are Phase 2.
- **No crowds, moving vehicles, time of day (the clock runs, the sky does not
  change), inventory or audio.** Story characters stand still at their posts.
- **Only M01 is playable.** After it the campus is free roam until Mission 2
  is built.
- **No interiors**: rooms, including A-214, are reached through story cards.
- **One save per browser**, in local storage — no cloud saves, by design (no
  backend).
- **The third-person camera avoids walls but not low objects**: it may pull in
  briefly behind a bench or bollard.
- **Not yet tested on a physical Android phone.** See [TODO.md](TODO.md).
