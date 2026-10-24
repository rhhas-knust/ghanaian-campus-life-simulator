#!/usr/bin/env python3
"""
Builds the runtime models in public/assets/models/ from the CC0 source packs.

Standard library only, so it needs nothing installed. Run it from the
repository root after cloning the source packs (see scripts/assets/README.md):

    python3 -I scripts/assets/build_models.py --sources <dir with the packs>

The outputs are committed, so nobody needs to run this to build the game; it
exists so the models can be rebuilt (or rebuilt differently) without guessing
what was done to them. What it does, and why:

* characters/student-{man,woman}.glb — Quaternius "Modular Men/Women" casual
  bodies. UVs dropped (the packs are flat-coloured, no textures), joints and
  weights stored as bytes, and every material renamed to the ROLE it plays
  (skin, hair, top, bottom, shoes, ...). The game recolours by role and merges
  the parts into one mesh, so each character is a single draw call.
* characters/animations.glb — clips from the Quaternius Universal Animation
  Library, on its own skeleton. Mesh dropped; only the clips the game plays,
  and only the channels of the bones it retargets onto the bodies above.
* furniture/furniture-kit.glb — the KayKit Furniture Bits pieces the interiors
  use, merged into one file sharing the pack's single 15 KB palette texture.
"""

from __future__ import annotations

import argparse
import array
import json
import struct
from pathlib import Path

GLB_MAGIC = 0x46546C67
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942

FLOAT = 5126
UNSIGNED_BYTE = 5121
UNSIGNED_SHORT = 5123
UNSIGNED_INT = 5125
COMPONENT_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
COMPONENT_CODE = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
TYPE_COUNT = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

# --------------------------------------------------------------------------- sources

QUATERNIUS = 'quaternius-showcase/public/glb'
UAL = 'ual/glTF/AnimationLibrary_Godot_Standard.gltf'
KAYKIT_FURNITURE = 'KayKit-Furniture-Bits-1.0/addons/kaykit_furniture_bits/Assets/gltf'

# Material name in the source pack -> role, per mesh. The role is what the game
# recolours (CHARACTER_BIBLE.md §4 asks for Ghanaian skin tones and black hair,
# which the packs do not have).
CHARACTERS = {
    'student-man': (
        f'{QUATERNIUS}/modular_men/Casual.glb',
        {
            ('Casual_Body', 'Purple'): 'top',
            ('Casual_Body', 'Skin'): 'skin',
            ('Casual_Feet', 'Purple'): 'shoes',
            ('Casual_Feet', 'White'): 'soles',
            ('Casual_Head', 'Skin'): 'skin',
            ('Casual_Head', 'Eyebrows'): 'brows',
            ('Casual_Head', 'Eye'): 'eyes',
            ('Casual_Head', 'Hair'): 'hair',
            ('Casual_Legs', 'Skin'): 'skin',
            ('Casual_Legs', 'LightBlue'): 'bottom',
        },
    ),
    'student-woman': (
        f'{QUATERNIUS}/modular_women/Casual.glb',
        {
            ('Casual_Body', 'White'): 'top',
            ('Casual_Body', 'Skin'): 'skin',
            ('Casual_Feet', 'Skin'): 'skin',
            ('Casual_Feet', 'Grey'): 'shoes',
            ('Casual_Head', 'Skin'): 'skin',
            ('Casual_Head', 'Hair_Blond'): 'hair',
            ('Casual_Head', 'Hair_Brown'): 'brows',
            ('Casual_Head', 'Brown'): 'eyes',
            ('Casual_Legs', 'Orange'): 'bottom',
        },
    ),
}

ANIMATION_CLIPS = ['A_TPose', 'Idle_Loop', 'Idle_Talking_Loop', 'Walk_Loop', 'Jog_Fwd_Loop']

# The UAL bones the game retargets (src/actors/characterRig.ts), plus their
# ancestors, whose motion the retarget needs to work out world rotations.
ANIMATION_BONES = {
    'Rig', 'root', 'DEF-hips', 'DEF-spine.001', 'DEF-spine.002', 'DEF-spine.003', 'DEF-neck', 'DEF-head',
    'DEF-shoulder.L', 'DEF-upper_arm.L', 'DEF-forearm.L', 'DEF-hand.L',
    'DEF-shoulder.R', 'DEF-upper_arm.R', 'DEF-forearm.R', 'DEF-hand.R',
    'DEF-thigh.L', 'DEF-shin.L', 'DEF-foot.L', 'DEF-thigh.R', 'DEF-shin.R', 'DEF-foot.R',
}

# Must match FURNITURE_PIECES in src/world/interiors/furnitureKit.ts.
FURNITURE = [
    'bed_single_A', 'bed_single_B', 'table_medium', 'table_medium_long', 'chair_A_wood', 'couch',
    'lamp_table', 'book_set', 'rug_rectangle_stripes_A',
]


# --------------------------------------------------------------------------- glTF io


def read_gltf(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    if path.suffix == '.glb':
        magic, _version, _length = struct.unpack_from('<III', data, 0)
        if magic != GLB_MAGIC:
            raise SystemExit(f'{path}: not a GLB')
        json_length, json_type = struct.unpack_from('<II', data, 12)
        assert json_type == CHUNK_JSON
        doc = json.loads(data[20:20 + json_length])
        offset = 20 + json_length
        binary = b''
        if offset < len(data):
            bin_length, bin_type = struct.unpack_from('<II', data, offset)
            assert bin_type == CHUNK_BIN
            binary = data[offset + 8:offset + 8 + bin_length]
        return doc, binary
    doc = json.loads(data)
    buffers = doc.get('buffers', [])
    if len(buffers) != 1 or 'uri' not in buffers[0] or buffers[0]['uri'].startswith('data:'):
        raise SystemExit(f'{path}: expected one external buffer')
    return doc, (path.parent / buffers[0]['uri']).read_bytes()


def accessor_values(doc: dict, binary: bytes, index: int) -> list:
    """Every component of an accessor, as a flat list."""
    accessor = doc['accessors'][index]
    view = doc['bufferViews'][accessor['bufferView']]
    components = TYPE_COUNT[accessor['type']]
    size = COMPONENT_SIZE[accessor['componentType']]
    code = COMPONENT_CODE[accessor['componentType']]
    stride = view.get('byteStride', components * size)
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    values: list = []
    for element in range(accessor['count']):
        values.extend(struct.unpack_from(f'<{components}{code}', binary, start + element * stride))
    if accessor.get('normalized'):
        scale = {5121: 255, 5123: 65535, 5120: 127, 5122: 32767}[accessor['componentType']]
        values = [max(value / scale, -1.0) for value in values]
    return values


class Writer:
    """Accumulates bufferViews and accessors for one output file."""

    def __init__(self) -> None:
        self.binary = bytearray()
        self.views: list[dict] = []
        self.accessors: list[dict] = []

    def view(self, payload: bytes, target: int | None = None) -> int:
        while len(self.binary) % 4:
            self.binary.append(0)
        view = {'buffer': 0, 'byteOffset': len(self.binary), 'byteLength': len(payload)}
        if target is not None:
            view['target'] = target
        self.binary.extend(payload)
        self.views.append(view)
        return len(self.views) - 1

    def accessor(self, values: list, component_type: int, kind: str, *, normalized: bool = False,
                 bounds: bool = False, target: int | None = None) -> int:
        code = COMPONENT_CODE[component_type]
        payload = array.array(code, values).tobytes()
        # Vertex attributes must start on a 4-byte boundary per element.
        accessor = {
            'bufferView': self.view(payload, target),
            'componentType': component_type,
            'count': len(values) // TYPE_COUNT[kind],
            'type': kind,
        }
        if normalized:
            accessor['normalized'] = True
        if bounds:
            n = TYPE_COUNT[kind]
            accessor['min'] = [min(values[i::n]) for i in range(n)]
            accessor['max'] = [max(values[i::n]) for i in range(n)]
        self.accessors.append(accessor)
        return len(self.accessors) - 1

    def write(self, doc: dict, path: Path) -> None:
        doc['bufferViews'] = self.views
        doc['accessors'] = self.accessors
        while len(self.binary) % 4:
            self.binary.append(0)
        doc['buffers'] = [{'byteLength': len(self.binary)}]
        doc['asset'] = {'version': '2.0', 'generator': 'scripts/assets/build_models.py'}
        text = json.dumps(doc, separators=(',', ':')).encode()
        text += b' ' * (-len(text) % 4)
        out = struct.pack('<III', GLB_MAGIC, 2, 12 + 8 + len(text) + 8 + len(self.binary))
        out += struct.pack('<II', len(text), CHUNK_JSON) + text
        out += struct.pack('<II', len(self.binary), CHUNK_BIN) + bytes(self.binary)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(out)
        print(f'{path}: {len(out) / 1024:.0f} KB')


ARRAY_BUFFER = 34962
ELEMENT_ARRAY_BUFFER = 34963


# --------------------------------------------------------------------------- characters


def quantise_weights(weights: list[float]) -> list[int]:
    """Four weights per vertex as bytes that still sum to exactly 255."""
    out: list[int] = []
    for i in range(0, len(weights), 4):
        group = weights[i:i + 4]
        total = sum(group) or 1.0
        scaled = [round(w / total * 255) for w in group]
        scaled[scaled.index(max(scaled))] += 255 - sum(scaled)
        out.extend(scaled)
    return out


def build_character(source: Path, roles: dict, target: Path) -> None:
    doc, binary = read_gltf(source)
    writer = Writer()
    role_materials: dict[str, int] = {}
    materials: list[dict] = []
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            source_material = doc['materials'][primitive['material']]
            role = roles.get((mesh['name'], source_material['name']))
            if role is None:
                raise SystemExit(f'{source}: no role for {mesh["name"]} / {source_material["name"]}')
            if role not in role_materials:
                role_materials[role] = len(materials)
                materials.append({'name': role, 'pbrMetallicRoughness': {
                    'baseColorFactor': source_material.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1]),
                    'metallicFactor': 0, 'roughnessFactor': 1}})
            attributes = primitive['attributes']
            joints = accessor_values(doc, binary, attributes['JOINTS_0'])
            if max(joints) > 255:
                raise SystemExit(f'{source}: more than 256 joints')
            primitive['attributes'] = {
                'POSITION': writer.accessor(accessor_values(doc, binary, attributes['POSITION']), FLOAT, 'VEC3', bounds=True, target=ARRAY_BUFFER),
                'NORMAL': writer.accessor(accessor_values(doc, binary, attributes['NORMAL']), FLOAT, 'VEC3', target=ARRAY_BUFFER),
                'JOINTS_0': writer.accessor(joints, UNSIGNED_BYTE, 'VEC4', target=ARRAY_BUFFER),
                'WEIGHTS_0': writer.accessor(quantise_weights(accessor_values(doc, binary, attributes['WEIGHTS_0'])), UNSIGNED_BYTE, 'VEC4', normalized=True, target=ARRAY_BUFFER),
            }
            indices = accessor_values(doc, binary, primitive['indices'])
            primitive['indices'] = writer.accessor(indices, UNSIGNED_SHORT if max(indices) < 65535 else UNSIGNED_INT, 'SCALAR', target=ELEMENT_ARRAY_BUFFER)
            primitive['material'] = role_materials[role]
    for skin in doc['skins']:
        skin['inverseBindMatrices'] = writer.accessor(accessor_values(doc, binary, skin['inverseBindMatrices']), FLOAT, 'MAT4')
    doc['materials'] = materials
    for key in ('textures', 'images', 'samplers', 'animations'):
        doc.pop(key, None)
    writer.write(doc, target)


# --------------------------------------------------------------------------- animations


def build_animations(source: Path, target: Path) -> None:
    doc, binary = read_gltf(source)
    names = [node.get('name') for node in doc['nodes']]
    missing = ANIMATION_BONES - set(names)
    if missing:
        raise SystemExit(f'{source}: missing bones {sorted(missing)}')

    # Keep the skeleton only: no mesh, no skin, no materials.
    keep = [i for i, name in enumerate(names) if name in ANIMATION_BONES or name.startswith('DEF-')]
    remap = {old: new for new, old in enumerate(keep)}
    nodes = []
    for old in keep:
        node = {k: v for k, v in doc['nodes'][old].items() if k not in ('mesh', 'skin', 'children')}
        children = [remap[c] for c in doc['nodes'][old].get('children', []) if c in remap]
        if children:
            node['children'] = children
        nodes.append(node)
    roots = [remap[i] for i in keep if not any(i in doc['nodes'][p].get('children', []) for p in keep)]

    writer = Writer()
    animations = []
    by_name = {a['name']: a for a in doc['animations']}
    for clip in ANIMATION_CLIPS:
        animation = by_name.get(clip)
        if animation is None:
            raise SystemExit(f'{source}: no clip {clip}')
        channels, samplers = [], []
        for channel in animation['channels']:
            node = channel['target'].get('node')
            path = channel['target']['path']
            if node is None or names[node] not in ANIMATION_BONES or path == 'scale':
                continue
            # Only the hips travel; every other bone just turns.
            if path == 'translation' and names[node] != 'DEF-hips':
                continue
            sampler = animation['samplers'][channel['sampler']]
            times = accessor_values(doc, binary, sampler['input'])
            values = accessor_values(doc, binary, sampler['output'])
            kind = 'VEC4' if path == 'rotation' else 'VEC3'
            samplers.append({
                'input': writer.accessor(times, FLOAT, 'SCALAR', bounds=True),
                'output': writer.accessor(values, FLOAT, kind),
                'interpolation': sampler.get('interpolation', 'LINEAR'),
            })
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': remap[node], 'path': path}})
        animations.append({'name': clip, 'channels': channels, 'samplers': samplers})

    out = {'scene': 0, 'scenes': [{'nodes': roots}], 'nodes': nodes, 'animations': animations}
    writer.write(out, target)


# --------------------------------------------------------------------------- furniture


def build_furniture(source_dir: Path, target: Path) -> None:
    writer = Writer()
    out: dict = {'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': []}
    texture_uri = None
    for name in FURNITURE:
        doc, binary = read_gltf(source_dir / f'{name}.gltf')
        if len(doc['materials']) != 1 or len(doc['images']) != 1:
            raise SystemExit(f'{name}: expected the shared palette material')
        uri = doc['images'][0]['uri']
        if texture_uri not in (None, uri):
            raise SystemExit(f'{name}: uses a different texture ({uri})')
        texture_uri = uri
        if len(doc['nodes']) != 1 or any(k in doc['nodes'][0] for k in ('translation', 'rotation', 'scale', 'matrix')):
            raise SystemExit(f'{name}: expected one untransformed node')
        primitives = []
        for primitive in doc['meshes'][doc['nodes'][0]['mesh']]['primitives']:
            attributes = primitive['attributes']
            primitives.append({
                'attributes': {
                    'POSITION': writer.accessor(accessor_values(doc, binary, attributes['POSITION']), FLOAT, 'VEC3', bounds=True, target=ARRAY_BUFFER),
                    'NORMAL': writer.accessor(accessor_values(doc, binary, attributes['NORMAL']), FLOAT, 'VEC3', target=ARRAY_BUFFER),
                    'TEXCOORD_0': writer.accessor(accessor_values(doc, binary, attributes['TEXCOORD_0']), FLOAT, 'VEC2', target=ARRAY_BUFFER),
                },
                'indices': writer.accessor(accessor_values(doc, binary, primitive['indices']), UNSIGNED_SHORT, 'SCALAR', target=ELEMENT_ARRAY_BUFFER),
                'material': 0,
            })
        out['meshes'].append({'name': name, 'primitives': primitives})
        out['nodes'].append({'name': name, 'mesh': len(out['meshes']) - 1})
        out['scenes'][0]['nodes'].append(len(out['nodes']) - 1)

    assert texture_uri is not None
    png = (source_dir / texture_uri).read_bytes()
    out['images'] = [{'bufferView': writer.view(png), 'mimeType': 'image/png', 'name': 'furniturebits_texture'}]
    # Nearest filtering: the texture is a palette of flat swatches, and
    # blending between neighbouring swatches would tint the edges.
    out['samplers'] = [{'magFilter': 9728, 'minFilter': 9728}]
    out['textures'] = [{'source': 0, 'sampler': 0}]
    out['materials'] = [{'name': 'furniture-kit', 'pbrMetallicRoughness': {
        'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}]
    writer.write(out, target)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--sources', type=Path, required=True, help='directory holding the cloned source packs')
    parser.add_argument('--out', type=Path, default=Path('public/assets/models'))
    args = parser.parse_args()

    for name, (path, roles) in CHARACTERS.items():
        build_character(args.sources / path, roles, args.out / 'characters' / f'{name}.glb')
    build_animations(args.sources / UAL, args.out / 'characters' / 'animations.glb')
    build_furniture(args.sources / KAYKIT_FURNITURE, args.out / 'furniture' / 'furniture-kit.glb')


if __name__ == '__main__':
    main()
