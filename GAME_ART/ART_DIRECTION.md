# Art direction

How the concept art in this folder is used by the game, and the rules that keep
new work consistent with it. Written from the eleven reference images; see
[`README.md`](README.md) for what each image shows.

## The look

**Stylised-realistic contemporary Ghanaian university campus, in warm
afternoon light.** Clean shapes, flat colours, no grime — closer to the
elevation sheets than to a photograph.

### Palette

Every value below is a key in `src/config/palette.ts`; change it there and the
whole campus follows.

| Element | Colour | Palette key |
| --- | --- | --- |
| Walls (render) | warm cream `#ede0bf` | `wallCream` |
| Stair cores, Hostel A | terracotta render `#c0674d` | `wallRed` |
| Roofs (corrugated) | red oxide `#b85b46` | `roofRed` |
| Window frames, doors, balustrades, fascias | green `#4e7a55` | `trimGreen` |
| Columns, slab edges, canopies | pale cream `#f3ebd6` | `column` |
| Plinths, steps | grey concrete `#a9a59b` | `plinth` |
| Roads and car parks | asphalt `#45484c` | `asphalt` |
| Footpaths | tan `#e2cd9f` | `pavingTan` |
| Courtyard plaza, patio | stone `#c2bdb2` | `pavingStone` |

### Buildings

From `buildings/*.jpeg`. Every building in the game is built from these rules:

- A **raised grey plinth** with steps at the entrance.
- **Cream render** with a slab-edge band at every floor.
- **Green-framed windows**; on corridor faces, every third bay is a green door.
- **Open corridors (verandahs)** with a column every ~3.4 m and **green
  balustrades** on every upper floor.
- **External stair towers** at the short ends of long wings.
- An **entrance canopy** on two columns, carrying a **name board** — cream
  with green lettering, like the "LIBRARY" and "HASTECH HOSTELS" signs.
- **Hip roofs** in red corrugated metal with a green fascia and wide eaves.
  Hostel A's flat roof is the one exception in the art; the game uses hip roofs
  throughout for consistency (see *Open questions*).

### Plan form

From `campus-map/campus_masterplan.jpeg`. The **H-plan** is the signature form:
the library and the student centre are H's on the plan, and the game adds two
more (the Administration Block and the Faculty of Engineering) on the plan's
empty lawns. Lecture halls are rings around light courts; hostels are
courtyard blocks entered through a signed gateway; the cafeteria is a C opening
onto its patio.

### Props and planting

From `props/campus_props_reference.jpeg`: coconut and fan palms, fruiting
mango trees, broadleaf shade trees, timber-and-concrete benches, a timber
finger-post sign, single-arm street lamps, concrete bins and bollards.

### Interface

From `ui-ux/*.jpeg`: dark, translucent, rounded pills over the 3D view; a
location pill top-centre with a pin icon; a round north-up minimap top-right; a
round pause button top-left; the joystick bottom-left; a large round INTERACT
button with a hand icon bottom-right; a pause menu with a green patterned
border.

The story screens have no mock-ups yet, so they extend the same language:
a round **phone button** beside the pause button; an **objective card** (dark
pill, gold left edge) under it; a **gold diamond** as the objective marker on
the minimap, the campus map and floating in the world; a dark **conversation
panel** along the bottom with a round portrait disc in the character's
signature colour (CHARACTER_BIBLE.md §4); a cream **phone** with a green header;
letterbox bars and white captions for the cinematic. Mock-ups for the
conversation panel, the phone and character creation would be welcome — the
current ones are placeholders built to the existing palette.

## What is used at runtime, and what is not

The images are **2D concept renders**: several views per sheet, on a white
background, with labels, perspective and lighting baked in. A game engine needs
**3D models** (meshes it can light and walk around), so these images cannot be
loaded as buildings or props. They are used three ways instead:

| Use | Images |
| --- | --- |
| **Loaded at runtime** | The master plan becomes the in-game **campus map** (`public/assets/images/campus-map.webp`). Storyboard frame 3 becomes the **title-screen background** (`title-background.webp`). Both are downscaled WebP copies — about 200 KB together instead of 7 MB. |
| **Traced into data** | The master plan's pixel coordinates ARE the layout in `src/config/campusLayout.ts`, so the 3D world and the map line up exactly. |
| **Followed by the procedural geometry** | Building elevations, props and UI mock-ups set the palette, proportions and details listed above. |

The originals here are never shipped with the site: everything in `public/`
is deployed, and this folder is not in `public/`.

### Turning the art into real 3D assets

To replace a placeholder with a real model:

1. **Model it in Blender** (or similar) from the elevation sheet, at real-world
   scale in metres, entrance facing -Z, origin at the centre of the footprint
   on the ground. Image-to-3D tools can produce a starting mesh, but expect to
   clean it up: they rarely produce game-ready topology, scale or materials.
2. Export **glTF binary (`.glb`)**, under 6,000 triangles per building, textures
   at most 1024 px.
3. Put it in `public/assets/models/`, register it in `src/config/assets.ts`,
   and set `model: '<key>'` on the building in `campusLayout.ts`.

Full brief: [`public/assets/README.md`](../public/assets/README.md). Loading
`.glb` models is planned for Phase 2.

## Open questions for the artist

- **Hostel A** has a flat roof and six storeys; **Hostel B** has hip roofs and
  four. Are both designs wanted, or is one the standard?
- The **minimap reference** shows a cross-shaped "Great Hall" in the courtyard,
  but the **master plan** has a monument there. Which is right?
- **Character portraits** for the conversation panel: the panel currently
  shows initials on the signature colour. Head-and-shoulders portraits per
  character would replace them.
- The two **extra H buildings** (Administration, Engineering) are not on the
  master plan. If the plan is updated, their positions in `campusLayout.ts` and
  `ADDED_SINCE_MASTER_PLAN` should follow it.
