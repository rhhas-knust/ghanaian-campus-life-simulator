# TODO

Live backlog. Longer-range plans are in [PROJECT_PHASES.md](PROJECT_PHASES.md).

---

## Phase 1 progress

Everything below was verified by running it, as noted.

- [x] Layout traced from the master plan — checked visually in the browser
- [x] Four H-plan buildings (Library, Student Centre, Administration,
      Engineering) — checked visually; shown on minimap and campus map
- [x] Buildings in the elevation-sheet style, with name boards — checked visually
- [x] First- and third-person cameras with toggle (`V`, camera button, pause
      menu) — smoke test
- [x] Third-person camera stays out of buildings — smoke test
- [x] Touch look no longer drifts towards the sky — smoke test (sideways
      swipe: 0.013 rad of pitch, was ~0.17)
- [x] Touch joystick, look and interact — smoke test (synthetic touch events)
- [x] Collision — smoke test (stops at the Library's verandah edge)
- [x] Interactive campus sign — smoke test
- [x] Pause / resume, campus map — smoke test
- [x] Quality presets rebuild in place — smoke test
- [x] HUD after the reference: location pill, minimap, camera button,
      INTERACT — checked visually at 800 x 360 landscape
- [x] Fullscreen and landscape lock on phones — code path only; see below
- [x] Typecheck, lint, production build — `npm run verify`
- [x] GitHub Pages deployment — live, last run green

## Still needed to call Phase 1 done

- [ ] **Play it on a real Android phone.** Everything above ran in headless
      Chromium with a software renderer and synthetic touches. Check:
  - [ ] frame rate on a mid-range phone, on each quality preset
  - [ ] the swipe-look fix *feels* right (and whether auto-level helps or
        annoys)
  - [ ] fullscreen and landscape lock behave in Chrome for Android
  - [ ] thumbstick size and position, INTERACT reach
  - [ ] HUD readability in bright sunlight
- [ ] **Answer the open art questions** in `GAME_ART/ART_DIRECTION.md`
      (Hostel A vs B design; Great Hall vs monument in the courtyard; whether
      the two added H buildings stay where they are).

## Design foundation (documents only — nothing implemented)

- [x] [GAME_DESIGN.md](GAME_DESIGN.md), [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md)
      and [STORYLINE.md](STORYLINE.md) written for *Campus Life: The Journey*
- [x] Owner decisions (2026-10-15):
  - University name: **UCIS University** — *Until Christ is Seen*, a
    church-founded university. Check the name is not a real institution
    before release.
  - Game title in the UI: **Campus Life: The Journey** — done on the title,
    loading and pause screens; the welcome board now reads *Welcome to UCIS
    University*.
  - **Six chapters** confirmed.
  - **Five programmes**: Engineering, Computer Science, Business
    Administration, Communication Studies and **Architecture**.
  - **Text only, no voice acting for now.**
- [x] Protagonist direction **D** confirmed: an ordinary student whose
      personal mystery (Kojo Badu's hidden phone in room A-214) leads into the
      larger campus controversy. Written into STORYLINE §1, CHARACTER_BIBLE and
      GAME_DESIGN §1.
- [x] Story decisions (owner):
  - Kojo's leak stays **two years ago** and stays mysterious: an unknown
    sender, and an origin confirmed only in the best ending (STORYLINE §4).
  - Meeting Kojo **depends on the player's choices** — in person, by message
    only, or never (STORYLINE S09 outcomes).
  - **Friendships only for now** — no romance (GAME_DESIGN §8, §13).
- [ ] Commission character concept sheets and rigged `.glb` models per
      CHARACTER_BIBLE.md §4 — blocks roadmap stage D.
- [ ] First buildable step when Phase 2 starts: roadmap stages A–C in
      GAME_DESIGN.md §12 (game state, dialogue, opening + M01). They need no
      new art.

## Next, within Phase 1 scope

- [ ] Run the smoke test in CI (it exists and passes; it is not wired into
      `deploy.yml` yet).
- [ ] Unit tests for the pure modules.
- [ ] Third-person camera: ignore low objects (benches, bollards) when pulling
      in, so it does not dip behind every bench.
- [ ] A small collider visualiser behind `?debug=1`, for checking layout.

## Known Phase 1 compromises

- Verandahs and steps are inside building colliders because there is no ground
  height or step-up yet.
- The flat world: no stairs, no upper floors, no interiors.
- Buildings are procedural placeholders until real models exist.
- Hostel A is drawn with hip roofs like Hostel B, not with its flat roof.
- Parked cars never move.
