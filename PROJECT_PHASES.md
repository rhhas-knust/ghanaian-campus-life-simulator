# Project phases

The plan from walkable prototype to a campus life simulator. Only **Phase 1** is
built. Everything after it is a sketch, and later phases are deliberately
sketchier than earlier ones — they will change once we have seen the artist's
assets and watched someone actually play.

| Phase | Theme | Status |
| --- | --- | --- |
| 1 | Walkable campus prototype | **Complete** |
| 2 | Real assets and a living campus | Not started |
| 3 | Student life systems | Not started |
| 4 | Academics and progression | Not started |
| 5 | Social life, story and polish | Not started |

---

## Phase 1 — Walkable campus prototype ✅

**Goal:** prove a Ghanaian campus can be explored in a browser on a phone,
and set up a structure the artist's work can drop into.

Delivered:

- First-person movement with keyboard/mouse and touch, on one shared input path.
- Circle-vs-rotated-box collision, campus bounds, sliding along walls.
- Procedural campus generated entirely from data files: entrance gate, boundary
  wall, avenue, courtyard, seven buildings, planting, street furniture, signage.
- Ghanaian-inspired architecture: raised plinths, verandah colonnades, balcony
  slabs, wide eaves on gable and hip roofs, breeze-block screens, louvre
  shutters, kente bands.
- Natural tropical daylight, gradient sky, distance fog, single-cascade shadows.
- Proximity interaction with eleven readable objects.
- Pause/resume, graphics quality presets, look sensitivity, persisted settings.
- Geometry batching: ~2,200 pieces into ~35 draw calls, ~29,000 triangles.
- Automatic GitHub Pages deployment with typecheck and lint gating the publish.
- Organised asset directories and a documented hand-off for the artist.

**Explicitly out of scope and still missing:** vertical movement, audio, NPCs,
time of day, any game systems, any save file, text rendered in 3D, and a unit
test suite.

---

## Phase 2 — Real assets and a living campus

**Goal:** replace the placeholders and make the campus feel inhabited.

### Asset pipeline
- glTF/GLB loader honouring `MODEL_ASSETS`, so a building with `model` set uses
  the real mesh. The hook already exists in `Buildings.ts`.
- Draco / meshopt decoding, and KTX2 textures where they pay for themselves.
- Progressive loading with a real progress bar, instead of the current
  all-at-once build.
- Import the artist's master campus plan into `campusLayout.ts`, probably via a
  small JSON importer rather than by hand.

### Terrain and traversal
- **Ground height sampling.** This unblocks the biggest Phase 1 compromise:
  verandahs and plinths are currently solid because the player cannot step up.
- Steps and ramps; gentle slopes across the campus.
- A capsule collider with a step-height allowance, replacing the 2D circle.

### Life
- Instanced student crowds walking between buildings on a path graph.
- Day/night cycle driving sun angle, colour and the lamp lights that are already
  wired to the lamp data.
- Weather, above all the Harmattan haze and a proper afternoon downpour.
- Ambience: birds, distant generators, traffic beyond the wall, footsteps that
  change with the surface.

### Interiors
- At least one building you can walk into — the library is the obvious first.
- Interior/exterior transitions that do not stall on a phone.

---

## Phase 3 — Student life systems

**Goal:** turn the campus into a place with needs and consequences.

- A clock, a timetable and a calendar.
- Hunger, energy and money. The Students' Centre chop bar becomes a real
  location with a menu and prices.
- Inventory: ID card, notebook, phone, food.
- Hall life: a room, roommates, the state of the water and the lights.
- A quest/task system, seeded by the SRC notice board that already exists as a
  readable object.
- Save and load, in `localStorage` — still no server.

---

## Phase 4 — Academics and progression

**Goal:** the actual point of being on campus.

- Attend lectures: being in the right room at the right time matters.
- Assignments, deadlines and the consequences of missing them.
- Quizzes and exams as minigames.
- Course selection, credits, CGPA.
- Semester structure, with matriculation and congregation in the Great Hall.
- Study mechanics: the library, group study, the night before.

---

## Phase 5 — Social life, story and polish

**Goal:** the things people will actually remember.

- NPC students with names, schedules and opinions. Friendship and reputation.
- Hall week, the jollof cook-off, SRC elections, inter-hall games.
- Clubs and societies.
- A main storyline across the academic year.
- Photo mode, achievements, an end-of-year summary.
- Accessibility pass: colour-blind-safe palette, subtitles, remappable controls,
  a reduced-motion option.
- Localisation, including Twi and Pidgin.

---

## Technical work that cuts across phases

These are not features, but they will each need a dedicated piece of work.

- **Unit tests.** `CollisionSystem`, `InteractionSystem`, `SeededRandom` and the
  zone resolver are all pure and trivially testable. First item on [TODO.md](TODO.md).
- **Performance budget in CI.** Fail the build if draw calls, triangle count or
  bundle size cross a threshold.
- **Cascaded shadow maps**, replacing the single wide cascade.
- **Level of detail and frustum culling** once the campus has real models.
- **Text in 3D** via an SDF font atlas, so signs can actually be read in-world.
- **Web Workers** for world generation, to keep the main thread free.
- **PWA / offline support** — valuable on intermittent mobile data.
