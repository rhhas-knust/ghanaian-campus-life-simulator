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

## Design foundation (documents)

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

## Phase 2 — story foundation (stages A–C)

Started at the owner's request ("Story opening first"). Verified as noted;
none of it has been played on a real phone yet.

- [x] Game state: flags, relationships, reputation, clock, save/continue in
      local storage — smoke test (save written; reload offers Continue and
      restores the story)
- [x] Objective tracker: HUD card, minimap marker, campus-map marker, floating
      beacon — checked visually in screenshots
- [x] Phone: objectives, messages, profile; `Tab` and the phone button —
      smoke test (opens, shows the objective, closes) and screenshots
- [x] Dialogue: JSON conversations validated at start-up, choices,
      conditions, effects — smoke test (Uncle Bright: choices with the
      player's name, relationship +5, mission step)
- [x] M00 arrival cinematic with Skip — smoke test (opens, Skip visible,
      Skip goes to creation); every shot checked in screenshots
- [x] Character creation: name, address, programme, home — smoke test on
      desktop and touch
- [x] M01 "Akwaaba" played to the end in headless Chromium: all seven steps,
      the night card, day 2 free roam, reload and Continue
- [ ] **Play the story on a real Android phone**: typing a name with the
      on-screen keyboard in fullscreen landscape, reading the dialogue box and
      phone at arm's length, tapping replies
- [x] Rigged characters to replace the standing placeholders — as a **trial**
      with free CC0 packs (README "Free model trial"); smoke test (models
      load and rig; the game still loads with placeholders when `*.glb` is
      blocked) and screenshots
- [ ] **Owner's verdict on the free model trial**, on a real phone: do the
      characters and furniture look right, and is it fast enough?
- [ ] If the trial is kept: re-download the two Quaternius packs from
      quaternius.com (the trial used GitHub mirrors) and rebuild with
      `scripts/assets/build_models.py`; an appearance picker; more outfits
- [ ] If the trial is kept: GitHub Pages may not gzip `.glb`; check the
      real download size (~1.2 MB uncompressed) on mobile data

## Phase 2 — interiors and M02 (stage C+)

Verified in headless Chromium (SwiftShader) and with synthetic touch; not on a
real phone.

- [x] Interior system: enter, explore, leave; fade transitions; collision;
      floor-plan minimap; indoor lighting; third-person camera under the
      ceiling — smoke test and screenshots
- [x] Entering and leaving repeatedly frees the interior — smoke test (GPU
      geometries unchanged after a round trip; five round trips checked by hand)
- [x] Changing graphics quality while indoors rebuilds the room around you —
      checked in the browser
- [x] Block A second floor: corridor, 13 closed doors with knocks, stairwell,
      A-214, common room — screenshots at 960 × 540 and 800 × 360
- [x] Porter's Lodge with counter, sign-in book, key board, lost-property
      cabinet — screenshots
- [x] M01 ends in the real A-214 — played to the end on a phone-sized touch
      screen in the browser, plus smoke test
- [x] M02 "Kojo's Missing Phone" — played to the end twice (kind and harsh
      choices: Kojo +20 with his number, or −27 without), plus smoke test
- [x] Save inside a building, reload mid-M02, finish M02 into free roam —
      smoke test
- [x] Saves from the previous release (no location; M01 done before M02
      existed, or mid-M01) — both load; the first continues into M02
- [ ] **Play it on a real Android phone**: the corridor with the thumbstick,
      tapping INTERACT at doors, frame rate indoors, the fade on a slow phone
- [ ] M03 "First Lecture" — the phone under the floor of A-214
- [ ] More interiors: the library and a lecture theatre
- [ ] Owner check: M02 adapts the brief to the story bible (Kojo is
      rusticated, so you meet him outside the gate, and the missing phone is
      his confiscated one, not the one under the floor); and missions from the
      old M02 onwards are renumbered M03–M17 (STORYLINE §2, §8)
- [ ] Owner check: the registry clerk **Mrs. Agyeman** is a new minor
      character, added for M01 step 4; and M01's signpost step now comes
      before the Administration Block (STORYLINE §2)

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
