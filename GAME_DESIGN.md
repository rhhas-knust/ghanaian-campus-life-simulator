# Game Design — Campus Life: The Journey

> *Your campus. Your choices. Your story.*

An open-world university life simulator with a connected storyline, set at a
**fictional** Ghanaian university. Android-first, played in a browser, built
with Three.js, TypeScript and Vite, hosted on GitHub Pages.

Companion documents: [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md) (cast),
[STORYLINE.md](STORYLINE.md) (plot and missions),
[GAME_ART/ART_DIRECTION.md](GAME_ART/ART_DIRECTION.md) (environment art).
Delivery order: [PROJECT_PHASES.md](PROJECT_PHASES.md).

---

## 0. Status: what exists versus what is planned

**Only the left-hand column exists in code.** Everything else in this document
is a design to build against, not a description of the game today.

| Implemented (Phase 1) | Planned |
| --- | --- |
| Game title and UCIS University name on the title, loading and pause screens and the welcome sign | Cinematic opening |
| Walkable 3D campus traced from the master plan | — |
| First- and third-person cameras, toggle | Character creation and avatar customisation |
| One fixed procedural student avatar | Rigged, animated characters (player and NPCs) |
| Keyboard/mouse and touch controls | Dialogue, choices, relationships, reputation |
| Collision; readable signs and plaques | Missions, chapters, endings |
| HUD: location pill, minimap, INTERACT, pause | Time of day, timetable, energy, money, grades |
| Campus map, settings, quality presets | Phone menu, save/load |
| Static GitHub Pages deployment | NPC schedules and crowds; audio |

The setting is **UCIS University** — *Until Christ is Seen* — a fictional,
church-founded Ghanaian university. It is not modelled on any real
institution, and no real university or person is depicted in the story.

---

## 1. Design pillars

1. **The campus is the main character.** Every system pulls the player around
   the real map: lectures in the lecture halls, food at the cafeteria, sleep in
   Hastech Hostels.
2. **Choices stick.** Decisions change relationships, reputation and which
   ending is reachable. Nothing is a "correct" answer.
3. **Grounded, then dramatic.** Ordinary student life — queues, deadlines,
   *dumsor*, mobile money — is the backdrop for a scandal that grows over one
   academic year. The protagonist is an **ordinary student** who finds a
   **personal mystery** (a former occupant's hidden phone in their room) that
   leads into the **larger campus controversy** (STORYLINE.md §1).
4. **Short sessions on a phone.** Anything worth doing fits in 5–15 minutes and
   saves automatically.

---

## 2. Core gameplay loop

```
 Wake in hostel ─▶ Check phone (timetable, messages, objectives)
        ▲                        │
        │                        ▼
   Sleep / save ◀── Free roam: lectures · study · eat · earn · socialise
        ▲                        │
        │                        ▼
  Consequences ◀── Story mission or side story when its trigger is met
```

- **Moment to moment:** walk, look, talk, choose, interact.
- **Daily:** spend limited **time** and **energy** across academics, money,
  friends and the story.
- **Chapter:** a main-story arc spanning roughly one stretch of the semester
  (see STORYLINE.md).
- **Year:** grades, reputation and story flags decide the ending.

Missions never trap the player. Between story beats the whole campus is open.

---

## 3. Free-roam exploration — planned

- The whole fenced campus is open from Chapter 1. No invisible walls beyond the
  existing fence.
- **Points of interest** use the existing interaction system: signs, plaques,
  notice boards, plus NPCs and phone-triggered locations.
- **Discovery:** each building has a short "first visit" note that unlocks a map
  label and sometimes a side story.
- **Time-locked spaces:** the library closes at 22:00, the cafeteria serves at
  set hours, the gate closes at 22:00 (late entry costs reputation with the
  porter).
- **Interiors:** Phase 1 has none. Planned interiors are limited to the
  library ground floor, one lecture theatre, the player's hostel room and the
  cafeteria hall, each loaded on entry rather than kept in memory.

---

## 4. Player avatar and customisation — planned

Character creation runs once, after the opening cinematic (STORYLINE.md §2).

| Option | Choices | Effect |
| --- | --- | --- |
| Name | Free text; optional Akan day name suggestion | Used in dialogue text |
| How you are addressed | He / she / they | Pronouns in dialogue |
| Body | 3 builds × 3 heights | Cosmetic |
| Skin tone | 8 swatches across deep to light brown | Cosmetic |
| Face | 6 presets | Cosmetic |
| Hair | Low cut, fade, twists, locs, cornrows, braids, afro puff, headwrap | Cosmetic |
| Outfit | Starter wardrobe of 6; more bought or earned | Cosmetic; some NPCs react to Friday wear |
| Programme | Engineering, Computer Science, Business Administration, Communication Studies, Architecture | Sets timetable, lecture locations, one exclusive side story, a small stat bias and occasional extra dialogue options |
| Home | Coastal city, northern town, Volta, Ashanti, abroad-raised | Flavour lines in dialogue only — no stat effect |

**Programmes** (five, confirmed):

| Programme | Home building | Skill bias | Story angle |
| --- | --- | --- | --- |
| Engineering | Faculty of Engineering | Focus | Access to Dr. Sarpong's lab and exams office |
| Computer Science | Lecture Hall 2 | Hustle | Can trace the group chat's file uploads |
| Business Administration | Lecture Hall 1 | Charisma | Reads the money trail more easily |
| Communication Studies | Lecture Hall 3 | Charisma | Closer to Esi and *The UCIS Echo* |
| Architecture | Lecture Hall 3 (design studios) | Focus | Can read Crestline's site plans and survey pegs |

Each programme gets one exclusive side story (STORYLINE.md S07) and a few
alternative dialogue options; none locks the player out of an ending.

The Phase 1 procedural avatar is a placeholder. Customisation needs the rigged
character pipeline in CHARACTER_BIBLE.md §4.

---

## 5. First- and third-person play

**Implemented:** both cameras, toggled with `V`, the HUD camera button or the
pause menu; the third-person camera avoids walls; touch-look drift fix.

**Planned rules:**

- **Free roam:** the player's choice, remembered between sessions.
- **Dialogue:** a framed two-shot regardless of mode, then back to the
  player's chosen mode.
- **Cinematics:** a scripted camera, skippable, never in first person.
- **Aiming-free:** no combat. Interaction stays proximity- and facing-based,
  as it is now.

---

## 6. NPCs — planned

### Tiers

| Tier | Who | Count on screen | Behaviour |
| --- | --- | --- | --- |
| **Story** | The cast in CHARACTER_BIBLE.md | ≤ 3 | Authored schedules, full dialogue, rigged hero models |
| **Named** | Porters, vendors, lecturers, classmates | ≤ 6 | Fixed post or simple schedule, short dialogue |
| **Crowd** | Generic students | ≤ 20 near the player | Walk between points on a path graph, idle, react with a glance |

### Behaviour model

- **Schedules:** each story and named NPC has a weekly timetable of
  `(day, time window) → location + activity`, stored as data.
- **State machine:** `idle → walking → at activity → talking → reacting`.
  No physics, no crowd simulation beyond path-following and spacing.
- **Awareness:** NPCs within a few metres turn to look; story NPCs comment on
  the player's reputation or recent choices with one-line "barks".
- **Story overrides:** a mission can pin an NPC to a place and time.

---

## 7. Dialogue and decisions — planned

- **Data-driven trees** (JSON), one file per conversation, never hard-coded in
  TypeScript. Nodes carry speaker, text, optional choices, conditions and
  effects.
- **Choices:** 2–4 per decision, short enough to read on a phone. Each choice
  is visibly tagged only when it is a **major decision** (a small icon), so
  players know when something big is at stake.
- **Conditions** read flags, relationship values, reputation, programme,
  money and time.
- **Effects** set flags, change relationships or reputation, give items or
  money, start or fail missions.
- **Presentation:** text only — **no voice acting for now** (it may be
  revisited later). Speaker name and portrait, tap to advance, auto-save after
  any major decision.
- **Language:** English as the base, with natural Ghanaian English and
  occasional Twi, Ga, Ewe and Pidgin phrases that are understandable in context.
  Localisation is a later polish item.

---

## 8. Relationships and reputation — planned

**Relationships:** one value per story character, −100 (hostile) to +100
(trusted), starting at the attitude in CHARACTER_BIBLE.md. Thresholds unlock
dialogue, help in missions, side stories and ending variants. Some characters
react to each other: helping Selasi may cost standing with KB.

**Reputation:** three campus-wide axes, each 0–100.

| Axis | Raised by | Lowered by |
| --- | --- | --- |
| **Integrity** | Honesty, refusing leaked papers, keeping promises | Cheating, lying, betraying a friend |
| **Popularity** | Events, helping people, the SRC campaign | Snitching (as others see it), absences, scandal |
| **Academic standing** | Attendance, study, assignments, exams | Missed lectures, late work, disciplinary cases |

The tension between Integrity and Popularity is deliberate — the story keeps
asking which matters more.

---

## 9. Student life systems — planned

| System | Rules | Ties to the map |
| --- | --- | --- |
| **Time** | A day lasts ~16 real minutes; sleeping skips to morning and saves. Weekly timetable from the programme. | Lecture halls, library hours, gate hours |
| **Energy** | Drops with activity; restored by sleep and meals. Low energy slows walking and study. | Hostels, cafeteria |
| **Money (₵)** | Starts with a small allowance; spent on food, data, transport, printing, clothes; earned through side jobs. Paid by mobile money in the phone menu. | Cafeteria, kiosks, Student Centre |
| **Academics** | Attendance and study build *knowledge* per course; quizzes, assignments and exams turn it into grades and a CGPA. | Lecture halls, library, Engineering |
| **Social** | Hangouts, events, group chats; build relationships and Popularity. | Courtyard, hostels, sports fields |
| **Personal development** | Four growing skills — **Focus**, **Charisma**, **Hustle**, **Resilience** — raised by doing related activities, unlocking dialogue options and easier checks. | Everywhere |

**The phone** is the main menu during play: timetable, messages (group chats
drive many missions, and the personal mystery arrives as messages to a second,
found phone), mobile-money wallet, map, objectives, settings. It
replaces separate menus, which keeps the HUD clean on a small screen.

Small, recurring setbacks keep it grounded: power cuts (*dumsor*) dim the
library, water runs out in the hostel, the printer queue is long. Each is a
short event, not a punishing system.

---

## 10. Missions, progression and consequences — planned

| Type | Purpose | Example |
| --- | --- | --- |
| **Main** | Advance the chapter story | M03 "The Group Chat" |
| **Side story** | Character arcs, optional | Hajia Zainab's debts |
| **Routine** | Repeatable life tasks | Attend a lecture, buy lunch |
| **Event** | Timed campus events | Hall week, SRC debate, a match on the field |

- **Objectives** are always shown on the minimap and in the phone; at most one
  main and two side objectives are pinned at a time.
- **Failure** is rarely game over. Missing a mission window usually moves the
  story down a different branch with a cost (relationship, reputation or money).
- **Consequences** are stored as named **flags** (e.g. `bought_leaked_paper`,
  `told_esi_the_truth`) plus relationship and reputation values. The ending is
  chosen from these at the end of the final chapter (STORYLINE.md §6).
- **Progression:** chapters unlock in order; side stories unlock by chapter,
  relationship or location. There is no XP level — growth is skills, grades,
  reputation and relationships.

---

## 11. Mobile performance constraints

These bind every planned system. Measured on a mid-range Android phone (target
30 fps), not on a desktop.

| Budget | Limit |
| --- | --- |
| Static campus draw calls | ~40 (today: ~38) |
| Characters on screen | ≤ 3 story + ≤ 6 named + ≤ 20 crowd |
| Skinned (animated) meshes updating per frame | ≤ 10; distant crowd NPCs use cheaper LOD or are hidden |
| Triangles per character | hero ≤ 12k, named ≤ 6k, crowd ≤ 3k |
| Character textures | hero one 1024² atlas, others 512² |
| Shadow casters | Player + nearest story NPCs only |
| Download before first play | ≤ 12 MB; chapters and interiors load on demand |
| Saves | On the device (localStorage / IndexedDB), never a server |
| Audio | Short compressed loops, loaded after first interaction |

Rules carried over from AGENTS.md: static scenery stays batched; anything that
moves stays out of the batches; no backend, database or paid API.

---

## 12. Staged implementation roadmap

Each stage ends playable. The "Phase" column maps onto
[PROJECT_PHASES.md](PROJECT_PHASES.md), which stays the source of truth for
delivery order.

| Stage | Delivers | Needs | Phase |
| --- | --- | --- | --- |
| **A. Game state foundation** | Save/load, flags, game clock, phone menu shell, objective tracker | Nothing new — code only | 2 |
| **B. Dialogue** | Dialogue runner, JSON format, choice UI, relationship/reputation values | A | 2 |
| **C. Opening and first mission** | Title card, skippable opening cinematic using the existing campus, M01 "Akwaaba" with placeholder NPCs | A, B | 2 |
| **D. Character pipeline** | Shared rig, first rigged hero model, character creation, player customisation | Character art (CHARACTER_BIBLE §4) | 2 |
| **E. Living campus** | NPC schedules, crowd students, time of day | D | 2 |
| **F. Life systems** | Energy, money, timetable, attendance, study, grades | A, E | 3–4 |
| **G. Chapters 1–3** | Main missions M01–M07, first side stories | B, C, F | 5 |
| **H. Chapters 4–6 and endings** | M08–M16, ending resolution, epilogue | G | 5 |
| **I. Polish** | Audio, interiors, localisation, accessibility | Any | 5 |

Stages A–C can start immediately on the current codebase; they need no new
art. Stage D is blocked on rigged character models — concept art alone is not
enough (CHARACTER_BIBLE.md §4).

---

## 13. Out of scope

Multiplayer, real-money purchases, accounts or any backend, real universities
or real people, combat, explicit sexual content, and anything that needs a
server to run.
