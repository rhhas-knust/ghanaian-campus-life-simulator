# Model credits and licences

Every model in this folder comes from a free pack released under
**CC0 1.0 (public domain)**. Nothing here needs attribution, but the authors
deserve it, so here it is. The files were slimmed by
[`scripts/assets/build_models.py`](../../../scripts/assets/build_models.py);
nothing was modelled or retextured by hand. The game recolours the characters
at runtime (skin, hair and clothes from `src/story/data/cast.ts`).

| File | What it is | Author | Pack | Licence |
| --- | --- | --- | --- | --- |
| `characters/student-man.glb` | The "Casual" body, materials renamed by role, UVs dropped | [Quaternius](https://quaternius.com) | [Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) | CC0 1.0 |
| `characters/student-woman.glb` | The "Casual" body, same treatment | [Quaternius](https://quaternius.com) | [Ultimate Modular Women](https://quaternius.com/packs/ultimatemodularwomen.html) | CC0 1.0 |
| `characters/animations.glb` | Five clips (T-pose, idle, talking, walk, jog) on the library's skeleton, mesh removed | [Quaternius](https://quaternius.com) | [Universal Animation Library](https://quaternius.itch.io/universal-animation-library) (free edition) | CC0 1.0 |
| `furniture/furniture-kit.glb` | Nine pieces and the shared palette texture | [Kay Lousberg](https://www.kaylousberg.com) | [KayKit Furniture Bits 1.0](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0) | CC0 1.0 |

## Where the source files were fetched from

The authors' own sites (quaternius.com, itch.io, kaylousberg.com) are not
reachable from the build environment, so the sources were taken from GitHub:

| Pack | Repository | Commit | Licence evidence |
| --- | --- | --- | --- |
| KayKit Furniture Bits 1.0 | [KayKit-Game-Assets/KayKit-Furniture-Bits-1.0](https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0) — the author's official repository | `96d5930` | `LICENSE.txt`: CC0 |
| Quaternius Modular Men / Women | [trebeljahr/quaternius-showcase](https://github.com/trebeljahr/quaternius-showcase) — an unofficial mirror | `722c39e` | `LICENSES.md`: both packs CC0-1.0, checked against quaternius.com |
| Quaternius Universal Animation Library | [J-Ponzo/gltf-universal-animation-library](https://github.com/J-Ponzo/gltf-universal-animation-library) — an unofficial mirror of the free edition | `e24c23c` | `LICENSE`: CC0 1.0 |

The two Quaternius sources are mirrors, not the author's own distribution.
Before a public release, re-download those packs from quaternius.com and run
the build script on them; the outputs should be identical.
