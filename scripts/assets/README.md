# Model build script

`build_models.py` turns the free CC0 source packs into the four files in
`public/assets/models/`. Those outputs are committed, so you only need this
to rebuild them — after changing which furniture pieces or animation clips
the game uses, for instance. It uses the Python standard library only.

```bash
mkdir -p ../model-sources && cd ../model-sources
git clone --depth 1 https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0.git
# A large repository; --filter fetches only the files the script reads.
git clone --depth 1 --filter=blob:none --sparse https://github.com/trebeljahr/quaternius-showcase.git
git -C quaternius-showcase sparse-checkout set public/glb/modular_men public/glb/modular_women
git clone --depth 1 https://github.com/J-Ponzo/gltf-universal-animation-library.git ual
cd -
python3 -I scripts/assets/build_models.py --sources ../model-sources
```

Downloaded packs are data from strangers: keep them outside the repository,
and run the script with `-I` so Python never imports anything that sits next
to them.

If you change the lists in the script, change the code that reads them too:

| List in the script | Must match |
| --- | --- |
| `FURNITURE` | `FURNITURE_PIECES` in `src/world/interiors/furnitureKit.ts` |
| `ANIMATION_CLIPS` | `MOTION_CLIPS` and `REFERENCE_CLIP` in `src/actors/characterRig.ts` |
| `ANIMATION_BONES` | `BONE_MAP` in `src/actors/characterRig.ts` (plus every ancestor) |
| roles in `CHARACTERS` | `ROLES` in `src/actors/characterRig.ts` |

Credits and licences: [`public/assets/models/CREDITS.md`](../../public/assets/models/CREDITS.md).
