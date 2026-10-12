# Art reference

Concept art for the campus, delivered as `GAME_ART.zip` on 2026-10-12. These
are **2D reference images**, not game-ready assets: nothing in the game loads
them.

They live here, outside `public/`, on purpose. Everything in `public/` is copied
into every GitHub Pages deploy; these 29 MB of JPEGs would be published without
the game ever using them. When a real model, texture or image is made *from* one
of these references, that derived asset goes in `public/assets/` and is
registered in `src/config/assets.ts` — see [`public/assets/README.md`](../public/assets/README.md).

**How the game uses this art, the palette, and the rules for new work:**
[`ART_DIRECTION.md`](ART_DIRECTION.md).

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

## Status

Phase 1 now follows this art: the layout is traced from the master plan, the
buildings follow the elevation sheets, and the HUD follows the UI mock-ups.
Two of the images are also loaded at runtime (as the campus map and the title
background). Details, and the open questions about inconsistencies within the
set, are in [`ART_DIRECTION.md`](ART_DIRECTION.md).
