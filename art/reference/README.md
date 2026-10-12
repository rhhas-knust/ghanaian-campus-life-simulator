# Art reference

Concept art for the campus, delivered as `GAME_ART.zip` on 2026-10-12. These
are **2D reference images**, not game-ready assets: nothing in the game loads
them.

They live here, outside `public/`, on purpose. Everything in `public/` is copied
into every GitHub Pages deploy; these 29 MB of JPEGs would be published without
the game ever using them. When a real model, texture or icon is made *from* one
of these references, that derived asset goes in `public/assets/` and is
registered in `src/config/assets.ts` — see [`public/assets/README.md`](../../public/assets/README.md).

All images are 2752 x 1536 JPEG.

## Index

### Campus map

| File | What it shows |
| --- | --- |
| [`campus-map/campus_masterplan.jpeg`](campus-map/campus_masterplan.jpeg) | Top-down master plan with a numbered legend: 1 main gate (gatehouse + barrier off a public road), 2 central courtyard (circular plaza with a monument, ringed by a road), 3 lecture halls (three linked blocks), 4 library (H-plan), 5 student centre (H-plan), 6 cafeteria (with outdoor umbrella seating), 7 hostels (two courtyard blocks), 8 football field, 9 basketball court. Includes car parks, internal roads and a perimeter fence. North is up. |

### Buildings

Each sheet shows front, side, rear and three-quarter views. Shared language
across all of them: cream render, red corrugated-metal hipped roofs, green
window frames, doors and balustrades, open corridors with balconies, external
stair towers at the ends, a raised plinth with entrance steps and a canopy.

| File | What it shows |
| --- | --- |
| [`buildings/lecture_hall_reference.jpeg`](buildings/lecture_hall_reference.jpeg) | Three-storey lecture block, hipped roof, balconied front corridor, end stair towers, entrance canopy. |
| [`buildings/library_reference.jpeg`](buildings/library_reference.jpeg) | Three-storey library: two hipped-roof wings joined by an open bridge carrying a "LIBRARY" sign, vertical fins on the facade, central stair. |
| [`buildings/c_shaped_cafeteria_reference.jpeg`](buildings/c_shaped_cafeteria_reference.jpeg) | Two-storey curved / C-shaped cafeteria with a wraparound upper dining terrace, tables visible inside, stairs at both ends. |
| [`buildings/hostel_a_reference.jpeg`](buildings/hostel_a_reference.jpeg) | Six-storey hostel with a **flat roof**, red-render stair cores, breeze-block screens and balconied corridors. |
| [`buildings/hostel_b_reference.jpeg`](buildings/hostel_b_reference.jpeg) | Four-storey U-shaped hostel with hipped roofs and a gateway canopy signed "HASTECH HOSTELS". |

### Props

| File | What it shows |
| --- | --- |
| [`props/campus_props_reference.jpeg`](props/campus_props_reference.jpeg) | Fan palm, fruiting mango tree, two palm-and-shrub clusters, ground shrubs, a timber-and-concrete bench, a timber finger-post sign, a single-arm street lamp, a concrete bin and a bollard. |

### UI / UX

| File | What it shows |
| --- | --- |
| [`ui-ux/gameplay_hud_reference.jpeg`](ui-ux/gameplay_hud_reference.jpeg) | Mobile HUD over a third-person view: pause button, energy bar, cedi balance (₵45.00), a "CENTRAL CAMPUS" location pill, a circular minimap with an objective ("GO TO LECTURE HALL"), left thumbstick, "swipe to look" hint, and an INTERACT button. |
| [`ui-ux/pause_menu_reference.jpeg`](ui-ux/pause_menu_reference.jpeg) | Pause menu with a green patterned border: Resume Game, Settings, Controls, Main Menu; side cards for current mission and player profile with in-game time. |
| [`ui-ux/minimap_reference.jpeg`](ui-ux/minimap_reference.jpeg) | Expanded circular minimap: player arrow with view cone, labelled Great Hall / Hostels / Main Entrance, objective star, zoom controls, north marker. |

### Gameplay storyboards

| File | What it shows |
| --- | --- |
| [`gameplay-storyboards/gameplay_storyboards.jpeg`](gameplay-storyboards/gameplay_storyboards.jpeg) | Four frames: (1) first-person, approaching the security gate; (2) first-person, along the main path; (3) the central courtyard and lecture halls; (4) third-person beside a campus information finger-post. Thumbstick shown in every frame. |

## How this compares with the current Phase 1 build

Recorded so the gap is visible, not as a decision about what to change.

- **Layout.** The master plan is a different campus from the one in
  `src/config/campusLayout.ts`: a roundabout courtyard with roads, hostels,
  a cafeteria, sports pitches and car parks, versus the current avenue,
  square courtyard and seven blocks.
- **Architecture.** Close in spirit (verandahs, balconies, red roofs, green
  trim), but the references use cream walls, hipped roofs throughout, external
  stair towers and green balustrades rather than the current ochre / terracotta
  palette and kente bands.
- **Camera.** Storyboard frame 4 and the HUD reference show a **third-person**
  view; the current build is first-person only. Frames 1–3 are first-person.
- **HUD.** Energy, money, minimap, objectives, mission and in-game time do not
  exist yet; the current HUD has a location label, interaction prompt, pause
  button and touch controls.
- **Life.** Vehicles and student NPCs appear throughout; the current build has
  none.
- **Consistency within the set.** The minimap reference shows a cross-plan
  "Great Hall" at the centre of a plaza, which does not match the master plan's
  monument courtyard. Hostel A (flat roof, six storeys) and Hostel B (hipped
  roofs, four storeys) are different designs. Worth confirming which is
  authoritative before modelling.
