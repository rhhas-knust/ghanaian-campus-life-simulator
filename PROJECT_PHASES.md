# Project phases

The roadmap from a walkable campus to a campus life simulator. **Phase 1** is
built, and **Phase 2 has started with the story opening** (GAME_DESIGN.md §12
stages A–C), at the owner's request. Later phases are deliberately sketchier than earlier ones — they will
change once the artist's 3D assets exist and people have actually played.

The game's systems, cast and story are designed in
[GAME_DESIGN.md](GAME_DESIGN.md), [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md) and
[STORYLINE.md](STORYLINE.md). Their staged roadmap (GAME_DESIGN.md §12) maps
onto the phases below; this file stays the source of truth for order.

| Phase | Theme | Status |
| --- | --- | --- |
| 1 | Playable campus | **Built** — awaiting a test on real Android hardware |
| 2 | Real assets and a living campus | **In progress** — story foundation (stages A–C), interiors and M02 built; assets and campus life not started |
| 3 | Student life systems | Not started |
| 4 | Academics and progression | Not started |
| 5 | Social life, story and polish | Not started |

---

## Phase 1 — Playable campus

**Goal:** a believable Ghanaian university campus you can explore in a browser,
on a desktop or an Android phone, built so the artist's work can drop in.

Delivered:

- **Layout traced from the master plan** in `GAME_ART/`: security gate,
  roundabout, circular courtyard with monument, three lecture halls, library,
  student centre, cafeteria, two hostels, football field, basketball court,
  car parks, perimeter fence.
- **Four H-plan buildings**: Library, Student Centre, Administration Block,
  Faculty of Engineering.
- **Buildings in the style of the elevation sheets**: cream render, green
  balustraded corridors, stair towers, signed entrance canopies, red hip roofs.
- **First- and third-person cameras** with a toggle; a student avatar with a
  walk cycle; a third-person camera that avoids walls.
- **Desktop and touch controls**, including the fix for touch look drifting
  towards the sky.
- **Collision** with buildings, fence, trees, posts, benches and cars.
- **Interactive campus sign**, signpost, notice board and building plaques.
- **Mobile HUD** after the reference: location pill, minimap, camera button,
  joystick, INTERACT button, pause menu.
- **Campus map** (the master plan, with a "you are here" marker).
- Pause/resume, three quality presets, persisted settings, fullscreen and
  landscape on phones, loading and error states.
- **GitHub Pages deployment** gated on typecheck, lint and build.
- **Browser smoke test** covering movement, collision, interaction,
  both cameras, the map and the touch controls (39 checks at the end of Phase
  1; 62 now that it also covers the story opening).

**Out of scope for Phase 1:** NPCs, missions, interiors, moving vehicles,
audio, time of day, inventory, save files, multiplayer, any backend.

---

## Phase 2 — Real assets and a living campus

**Goal:** replace the placeholders and make the campus feel inhabited.

### Story foundation — built (GAME_DESIGN.md §12, stages A–C)
Brought forward because the owner asked for a playable story start. It needs no
new art; it uses placeholder characters on the existing campus.
- **A. Game state:** flags, relationships, reputation, a game clock, one save
  slot in local storage, the objective tracker (HUD card, minimap and map
  marker, floating beacon) and the phone (objectives, messages, profile).
- **B. Dialogue:** JSON conversations validated at start-up, a dialogue runner
  with choices, conditions and effects, and the conversation box.
- **C. Opening:** title screen with New / Continue, the skippable M00 arrival
  cinematic, character creation (name, address, programme, home), and M01
  "Akwaaba" with Uncle Bright, Mrs. Agyeman and Nii as standing placeholders.

### Interiors and Mission 2 — built (stage C+)
Also at the owner's request.
- **Interior system:** floor plans as data, built on entry and freed on exit,
  one at a time; fade transitions; collision, interactables, indoor lighting,
  a floor-plan minimap and a ceiling for the third-person camera; the save
  remembers which building the player is in, and older saves still load.
- **Interiors:** Hastech Block A second floor (corridor, room A-214, common
  room) and the Porter's Lodge.
- **M02 "Kojo's Missing Phone"**, using both interiors, with choices that
  change Kojo's, Uncle Bright's and Nii's standing.

Still open: Mission 3 onwards, more interiors, and the rigged characters of
stage D.

### Free model trial — built, awaiting the owner's verdict
Also at the owner's request, after asking whether a realistic open-source
life game's graphics could be reused (they cannot; the open-source Sims
remakes need EA's files).
- **Rigged, animated characters** from free CC0 packs (Quaternius bodies,
  Quaternius Universal Animation Library clips retargeted at load) for the
  player and the whole cast, one draw call each, recoloured per character.
- **KayKit furniture** in A-214 and the Block A common room, one draw call
  per room.
- A **GLB loader** (`src/core/loadModels.ts`) with a full fallback to the
  procedural art, and a script that rebuilds the model files from the packs.

This is a trial: if the owner likes the look on their phone, stage D can
build on it (more bodies and outfits, an appearance picker); if not, deleting
the model files puts the game back exactly as it was.

### Assets
- Buildings honouring `model` in `campusLayout.ts` through the GLB loader
  the model trial added (`src/core/loadModels.ts`).
- Models built from the elevation sheets in `GAME_ART/buildings/`.
- A rigged student character replacing the procedural avatar, with proper
  walk and idle animations.
- Draco/meshopt and KTX2 compression where they pay for themselves.

### Traversal
- **Ground height and step height**, so verandahs, steps and plinths become
  walkable rather than part of the building colliders.
- More interiors on the same system — the library and a lecture theatre
  next (two are built: Block A's second floor and the Porter's Lodge).

### Life
- Students walking between buildings on a path graph (instanced, not batched).
- Cars entering through the gate and parking.
- Day/night cycle, using the lamp lights already wired to the lamp data.
- Ambient audio: birds, distant traffic, footsteps by surface.

---

## Phase 3 — Student life systems

**Goal:** needs, money and consequences — the parts of the HUD reference that
are not built yet (energy bar, cedi balance, objectives).

- Timetable and calendar (the clock itself exists since the Phase 2 story
  foundation).
- Energy, hunger and money (₵). The cafeteria becomes a real place to eat.
- Inventory: ID card, notebook, phone.
- Hostel life: a room in Hastech Hostels, a roommate, water and light.
- Routine and side tasks, seeded by the SRC notice board (main missions and
  saving on the device exist since the Phase 2 story foundation).

---

## Phase 4 — Academics and progression

- Lectures in the lecture halls at timetabled times.
- Assignments, deadlines, exams as mini-games.
- Courses, credits and CGPA.
- Semester structure, matriculation and congregation.

---

## Phase 5 — Social life, story and polish

- NPC students with names, schedules and opinions.
- Hall week, the jollof cook-off, SRC elections, inter-hostel football.
- A storyline across the academic year.
- Accessibility pass, localisation (including Twi), photo mode.

---

## Cross-cutting technical work

- Unit tests for the pure modules (`CollisionSystem`, `SeededRandom`,
  `resolveZoneName`, `InteractionSystem`, the plan conversions).
- The smoke test in CI.
- A performance budget in CI (draw calls, triangles, bundle size).
- Level of detail once real models arrive.
- Offline support (PWA) for patchy mobile data.
