# Project phases

The roadmap from a walkable campus to a campus life simulator. Only **Phase 1**
is built. Later phases are deliberately sketchier than earlier ones — they will
change once the artist's 3D assets exist and people have actually played.

| Phase | Theme | Status |
| --- | --- | --- |
| 1 | Playable campus | **Built** — awaiting a test on real Android hardware |
| 2 | Real assets and a living campus | Not started |
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
- **39-check browser smoke test** covering movement, collision, interaction,
  both cameras, the map and the touch controls.

**Out of scope for Phase 1:** NPCs, missions, interiors, moving vehicles,
audio, time of day, inventory, save files, multiplayer, any backend.

---

## Phase 2 — Real assets and a living campus

**Goal:** replace the placeholders and make the campus feel inhabited.

### Assets
- glTF/GLB loader honouring `MODEL_ASSETS`; any building with `model` set uses
  the real mesh (the hook already exists in `Buildings.ts`).
- Models built from the elevation sheets in `GAME_ART/buildings/`.
- A rigged student character replacing the procedural avatar, with proper
  walk and idle animations.
- Draco/meshopt and KTX2 compression where they pay for themselves.

### Traversal
- **Ground height and step height**, so verandahs, steps and plinths become
  walkable rather than part of the building colliders.
- At least one interior — the library is the obvious first.

### Life
- Students walking between buildings on a path graph (instanced, not batched).
- Cars entering through the gate and parking.
- Day/night cycle, using the lamp lights already wired to the lamp data.
- Ambient audio: birds, distant traffic, footsteps by surface.

---

## Phase 3 — Student life systems

**Goal:** needs, money and consequences — the parts of the HUD reference that
are not built yet (energy bar, cedi balance, objectives).

- Clock, timetable and calendar.
- Energy, hunger and money (₵). The cafeteria becomes a real place to eat.
- Inventory: ID card, notebook, phone.
- Hostel life: a room in Hastech Hostels, a roommate, water and light.
- Task/quest system, seeded by the SRC notice board.
- Save and load, on the device — still no server.

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
