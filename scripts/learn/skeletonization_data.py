"""Makes the data of the course "Skeletonized morphologies and their spines": one skeletonized neuron, its spines and
its membrane, in one frame, as small files the course's 3D figure loads, and a TypeScript module of facts about the
files for the course's panels.

The neuron is morph-spines' own example (https://github.com/openbraininstitute/morph-spines, examples/data/), a piece
of MICrONS neuron 864691134884740346:
    morphology_with_spines/864691134884740346_v1.0.h5   its skeleton, soma mesh and spines, in morph-spines' H5
                                                        format (the skeletonization workflow's <mesh>_with_spines.h5)
    morphology_meshes/864691134884740346.obj            its membrane as triangles, in nm
Everything is read through morph-spines, MorphIO, NeuroM, morph-tool and trimesh, and put in the frame the EM mesh
viewer shows the mesh in: µm, around the centre of the mesh's box.

It writes, in public/static/learn/skeletonization/:
    mesh.glb      the OBJ as a plain GLB in nm, which decodeGlb (em-cell-mesh/viewer/engine/decode.ts) recentres
    skeleton.swc  the H5's skeleton as SWC, moved into the mesh's frame, for parseSwc (morpho-viewer/engine/swc.ts)
    spines.bin    the spines' meshes (placed and in their own frames), their own skeletons and spine table columns,
                  and the soma's mesh, as little-endian typed arrays
    cell.json     where each array is in spines.bin, the camera's shots, counts, bounds and the checks' results
and src/features/learn/components/courses/skeleton/files.ts, which it formats with the repository's Biome.

Needs morph-spines, MorphIO, NeuroM, morph-tool, trimesh, h5py and scipy (obi-one's virtual environment has them all),
and matplotlib for --preview. The inputs default to ../data/morph-spines/ beside the repository. From its root:

    python scripts/learn/skeletonization_data.py [--h5 FILE] [--mesh FILE] [--preview DIR]

--preview DIR also draws each camera shot to DIR/preview-<shot>.png, to check the layers line up without a browser.
If node_modules/.bin/biome is missing, format the TypeScript by hand afterwards:
node_modules/.bin/biome format --write src/features/learn/components/courses/skeleton/files.ts
"""

import argparse
import json
import math
import struct
import subprocess
import sys
import tempfile
from importlib.metadata import version
from pathlib import Path

import h5py
import morphio
import neurom
import numpy as np
import trimesh
from morph_spines import load_morphology_with_spines, validate_morph_with_spines_file
from morph_tool import converter, transform
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT.parent / "data" / "morph-spines"
OUT = ROOT / "public/static/learn/skeletonization"
TS = ROOT / "src/features/learn/components/courses/skeleton/files.ts"
BIOME = ROOT / "node_modules/.bin/biome"

SOURCE = {
    "title": "MICrONS neuron 864691134884740346, from the examples of morph-spines",
    "url": "https://github.com/openbraininstitute/morph-spines",
    "path": "examples/data/",
    "licence": "Apache License 2.0",
    "credit": "Reconstructed from electron microscopy of mouse visual cortex by the MICrONS Consortium "
    "(Nature 640, 2025, doi:10.1038/s41586-025-08790-w)",
}

# µm per nm: EM meshes are in nanometres, morphologies in micrometres (decode.ts: EM_UNIT_UM)
UM_PER_NM = 1e-3
# glTF's component types
GL_FLOAT, GL_UNSIGNED_SHORT, GL_UNSIGNED_INT = 5126, 5123, 5125

CENTER = ["afferent_center_x", "afferent_center_y", "afferent_center_z"]
SURFACE = ["afferent_surface_x", "afferent_surface_y", "afferent_surface_z"]
ORIENTATION = ["spine_orientation_vector_x", "spine_orientation_vector_y", "spine_orientation_vector_z"]
ROTATION = ["spine_rotation_x", "spine_rotation_y", "spine_rotation_z", "spine_rotation_w"]
OPTIONAL = ["spine_type", "spine_volume", "spine_neck_diameter"]

# the camera's 'dendrite' shot: a stretch of about this many µm of the section with the most spines
STRETCH_UM = (12.0, 16.0)
# how far, in µm, the 'soma' shot reaches out along the stems beyond the soma
STEMS_UM = 9.0
# the 'spine' shot's spine is at least this long (µm), so its parts can be seen
SPINE_UM = 1.0


def num(value, digits=4):
    """A float for JSON, rounded, with -0.0 written as 0."""
    return round(float(value), digits) + 0.0


def vec(values, digits=4):
    return [num(v, digits) for v in values]


def unit(v):
    v = np.asarray(v, dtype=float)
    return v / np.linalg.norm(v)


def box(points):
    points = np.asarray(points)[:, :3]
    return {"min": vec(points.min(axis=0)), "max": vec(points.max(axis=0))}


# --- the mesh -------------------------------------------------------------------------------------------------------


def read_mesh(path):
    """The OBJ's vertices (nm) and triangles, as the file has them."""
    mesh = trimesh.load(str(path), file_type="obj", process=False, force="mesh")
    if len(np.unique(mesh.vertices, axis=0)) < len(mesh.vertices):
        mesh.merge_vertices()
    return np.asarray(mesh.vertices, dtype=np.float64), np.asarray(mesh.faces, dtype=np.int64)


def write_glb(path, positions, faces, name):
    """A plain GLB as decodeGlb reads it: one triangle primitive, float positions with their min and max (it recentres
    on the middle of these), and unsigned indices, 16-bit where the vertices allow. No normals: the viewer makes
    them."""
    positions = np.ascontiguousarray(positions, dtype="<f4")
    short = len(positions) < 65535  # glTF keeps an index type's largest value out of its indices
    indices = np.ascontiguousarray(faces.reshape(-1), dtype="<u2" if short else "<u4")
    position_bytes, index_bytes = positions.tobytes(), indices.tobytes()
    binary = position_bytes + index_bytes
    binary += b"\0" * (-len(binary) % 4)
    gltf = {
        "asset": {
            "version": "2.0",
            "generator": "scripts/learn/skeletonization_data.py",
            "copyright": SOURCE["credit"],
            "extras": {"unit": "nm"},
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": name}],
        "meshes": [{"name": name, "primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "mode": 4}]}],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": GL_FLOAT,
                "count": len(positions),
                "type": "VEC3",
                "min": [float(v) for v in positions.min(axis=0)],
                "max": [float(v) for v in positions.max(axis=0)],
            },
            {
                "bufferView": 1,
                "componentType": GL_UNSIGNED_SHORT if short else GL_UNSIGNED_INT,
                "count": len(indices),
                "type": "SCALAR",
            },
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(position_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": len(position_bytes), "byteLength": len(index_bytes), "target": 34963},
        ],
        "buffers": [{"byteLength": len(binary)}],
    }
    text = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode()
    text += b" " * (-len(text) % 4)
    total = 12 + 8 + len(text) + 8 + len(binary)
    path.write_bytes(
        struct.pack("<III", 0x46546C67, 2, total)
        + struct.pack("<II", len(text), 0x4E4F534A)
        + text
        + struct.pack("<II", len(binary), 0x004E4942)
        + binary
    )


def read_glb(path):
    """The GLB read back as decodeGlb reads it: its positions and indices, and the centre it recentres on."""
    data = path.read_bytes()
    magic, _, total = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67 and total == len(data)
    length, kind = struct.unpack_from("<II", data, 12)
    assert kind == 0x4E4F534A
    gltf = json.loads(data[20 : 20 + length])
    at = 20 + length
    bin_length, kind = struct.unpack_from("<II", data, at)
    assert kind == 0x004E4942
    binary = data[at + 8 : at + 8 + bin_length]
    (primitive,) = gltf["meshes"][0]["primitives"]
    position = gltf["accessors"][primitive["attributes"]["POSITION"]]
    index = gltf["accessors"][primitive["indices"]]
    views = gltf["bufferViews"]
    positions = np.frombuffer(
        binary, dtype="<f4", count=3 * position["count"], offset=views[position["bufferView"]]["byteOffset"]
    ).reshape(-1, 3)
    index_type = {GL_UNSIGNED_SHORT: "<u2", GL_UNSIGNED_INT: "<u4"}[index["componentType"]]
    indices = np.frombuffer(
        binary, dtype=index_type, count=index["count"], offset=views[index["bufferView"]]["byteOffset"]
    )
    centre = (np.array(position["min"], dtype=float) + np.array(position["max"], dtype=float)) / 2
    return positions, indices, centre, gltf


# --- the skeleton ---------------------------------------------------------------------------------------------------


def skeleton_swc(morphology, centre_um):
    """The H5's skeleton as SWC text, in the file's own coordinates and moved into the mesh's frame.

    The H5 keeps the soma as a contour of three points without a radius, the first points of the three stems. SWC has
    no contour soma: MorphIO writes one anyway, with the warning 'Soma must be stacked cylinders or a point', as three
    soma samples of radius 0, which read back as a stack of cylinders of no width. So the SWC is written as morph-tool
    converts the morphology with single_point_soma=True: the contour made into a stack of cylinders as NEURON's
    import3d does, and that into one sphere of the same surface at its centre."""
    with tempfile.TemporaryDirectory() as tmp:
        h5_path, swc_path, moved_path = (Path(tmp) / f for f in ("cell.h5", "cell.swc", "moved.swc"))
        morphio.mut.Morphology(morphology.to_morphio()).write(str(h5_path))
        converter.convert(str(h5_path), str(swc_path), single_point_soma=True)
        cell = morphio.mut.Morphology(str(swc_path))
        transform.translate(cell, -centre_um)
        cell.write(str(moved_path))
        return swc_path.read_text(), moved_path.read_text()


def parse_swc_sections(text):
    """The sections parseSwc (cell-morphology/morpho-viewer/engine/swc.ts) makes of SWC text, in its order, as xyz
    arrays, with how many soma samples it found and whether every parent comes before its child."""
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        fields = line.split()
        if len(fields) < 7:
            raise ValueError(f"SWC line with {len(fields)} columns: {line}")
        rows.append([float(v) for v in fields[:7]])
    rows = np.array(rows)
    ids, types, xyz, parent_ids = rows[:, 0].astype(int), rows[:, 1].astype(int), rows[:, 2:5], rows[:, 6].astype(int)
    index = {sample: k for k, sample in enumerate(ids)}
    parent = np.array([index.get(p, -1) if p >= 0 else -1 for p in parent_ids])
    children = [[] for _ in ids]
    for k, p in enumerate(parent):
        if p >= 0:
            children[p].append(k)
    sections, seen = [], set()
    for i in range(len(ids)):
        if types[i] == 1 or i in seen:
            continue
        p = parent[i]
        if not (p < 0 or types[p] == 1 or len(children[p]) != 1 or types[p] != types[i]):
            continue
        points = [xyz[p]] if p >= 0 else []
        current = i
        while True:
            seen.add(current)
            points.append(xyz[current])
            if len(children[current]) != 1 or types[children[current][0]] != types[current]:
                break
            current = children[current][0]
        sections.append(np.array(points))
    return sections, int((types == 1).sum()), bool(all(parent[k] < k for k in range(len(ids))))


def swc_matches_morphio(text, sections, soma_centre):
    """Whether parseSwc's sections are MorphIO's (pairs of whether it is a stem, and its points), in the same order: a
    stem's starts at the soma's centre, then runs as MorphIO's does; any other section starts at its parent's last
    point, as MorphIO's does too."""
    parsed, soma_samples, parents_first = parse_swc_sections(text)
    if soma_samples != 1 or not parents_first or len(parsed) != len(sections):
        return False
    for points, (is_root, expected) in zip(parsed, sections, strict=True):
        if is_root:
            if np.abs(points[0] - soma_centre).max() > 1e-4:
                return False
            points = points[1:]
        if points.shape != expected.shape or np.abs(points - expected).max() > 1e-4:
            return False
    return True


def polyline_distance(point, polyline):
    a, b = polyline[:-1], polyline[1:]
    ab = b - a
    lengths = np.einsum("ij,ij->i", ab, ab)
    u = np.clip(np.einsum("ij,ij->i", point - a, ab) / np.where(lengths == 0, 1, lengths), 0, 1)
    return float(np.linalg.norm(a + u[:, None] * ab - point, axis=1).min())


def section_id_offset(sections, centres, section_ids):
    """How the spine table's afferent_section_id relates to MorphIO's section index, from the geometry: the spines'
    afferent_center lies on section afferent_section_id - offset. Returns the offset and each tried offset's median
    distance (µm)."""
    medians = {}
    for offset in (0, 1, 2):
        distances = [
            polyline_distance(c, sections[s - offset].points) if 0 <= s - offset < len(sections) else math.inf
            for c, s in zip(centres, section_ids, strict=True)
        ]
        medians[offset] = float(np.median(distances))
    best = min(medians, key=medians.get)
    others = [m for o, m in medians.items() if o != best]
    if medians[best] > 0.01 or min(others) < 0.5:
        raise SystemExit(f"afferent_section_id does not match one section offset clearly: {medians}")
    return best, medians


# --- the spines -----------------------------------------------------------------------------------------------------


def spine_skeletons(spines):
    """Each spine's own skeleton, placed: points (x, y, z, r) and segments (pairs of point indices), a section's first
    point dropped where it repeats its parent's last, and its next joined to that instead."""
    points, segments, starts = [], [], [0]
    for neurite in spines.spine_skeletons:
        last = {}
        for section in neurite.root_node.ipreorder():
            xyzr = np.asarray(section.points, dtype=float)
            previous = None
            begin = 0
            if section.parent is not None:
                previous = last[section.parent.id]
                if np.abs(xyzr[0, :3] - points[previous][:3]).max() < 1e-6:
                    begin = 1
            for row in xyzr[begin:]:
                points.append(row)
                if previous is not None:
                    segments.append((previous, len(points) - 1))
                previous = len(points) - 1
            last[section.id] = previous
        starts.append(len(points))
    return np.array(points), np.array(segments), np.array(starts)


def neck_and_head(local, length, slices=10):
    """A spine's widths across its own axis, from its centred mesh cut into slices along y: the narrowest in its lower
    half (where a neck would be) and the widest in its upper half (where a head would be). Slices of fewer than 8
    vertices are left out, as too few to measure."""
    widths = []
    for k in range(slices):
        pick = local[(local[:, 1] >= length * k / slices) & (local[:, 1] < length * (k + 1) / slices)][:, [0, 2]]
        widths.append(
            2 * math.sqrt(((pick - pick.mean(axis=0)) ** 2).sum(axis=1).mean()) if len(pick) >= 8 else math.nan
        )
    return float(np.nanmin(widths[1:6])), float(np.nanmax(widths[5:]))


def branches(segments, start, end):
    """How many of a spine's own skeleton's points have more than two neighbours."""
    own = segments[(segments[:, 0] >= start) & (segments[:, 0] < end)] - start
    return int((np.bincount(own.reshape(-1), minlength=end - start) > 2).sum())


# --- the camera's shots ---------------------------------------------------------------------------------------------


def principal_axis(points):
    centred = points - points.mean(axis=0)
    axis = np.linalg.svd(centred, full_matrices=False)[2][0]
    return axis if axis @ (points[-1] - points[0]) >= 0 else -axis


def facing(direction, reference):
    """The direction or its opposite, whichever is on the same side as the reference."""
    return direction if direction @ reference >= 0 else -direction


def shot(target, radius, direction, up):
    return {"target": vec(target), "radius": num(radius, 2), "direction": vec(unit(direction)), "up": vec(unit(up))}


def make_shots(layers, morph_sections, table, offset, spine_choice, reversed_spines, centre_um):
    mesh, soma, spine_points, vertex_start = layers["mesh"], layers["soma"], layers["spines"], layers["vertexStart"]
    everything = np.vstack([mesh, layers["skeleton"][:, :3], spine_points])
    low, high = everything.min(axis=0), everything.max(axis=0)
    extent = high - low
    thin, long = int(np.argmin(extent)), int(np.argmax(extent))
    middle = 3 - thin - long
    axes = np.eye(3)
    # mostly along the slab's thin axis, from a little to one side and below, with the long axis up
    whole_direction = unit(axes[thin] + 0.35 * axes[middle] - 0.42 * axes[long])
    up = axes[long]
    shots = {"whole": shot((low + high) / 2, np.linalg.norm(extent) / 2, whole_direction, up)}

    soma_centre = soma.mean(axis=0)
    soma_reach = np.linalg.norm(soma - soma_centre, axis=1).max()
    shots["soma"] = shot(soma_centre, soma_reach + STEMS_UM, whole_direction, up)

    # the section with the most spines, and back along its parents to a stretch of STRETCH_UM
    counts = table["afferent_section_id"].value_counts().sort_index()
    section_id = int(counts.idxmax())
    section = morph_sections[section_id - offset]
    path, sections_on = section.points.astype(float), {section.id}
    while not section.is_root and np.linalg.norm(np.diff(path, axis=0), axis=1).sum() < STRETCH_UM[0]:
        section = section.parent
        path = np.vstack([section.points[:-1], path])
        sections_on.add(section.id)
    along = np.r_[0, np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))]
    path = path[along >= along[-1] - STRETCH_UM[1]] - centre_um
    rows = [i for i, s in enumerate(table["afferent_section_id"]) if s - offset in sections_on]
    seen = np.vstack([path] + [spine_points[vertex_start[i] : vertex_start[i + 1]] for i in rows])
    target = (seen.min(axis=0) + seen.max(axis=0)) / 2
    axis = principal_axis(path)
    # which way the spines stand out: their orientation vectors, turned round where the frame faces into the dendrite
    sideways = table.loc[rows, ORIENTATION].to_numpy(dtype=float)
    sideways *= np.where(np.isin(rows, reversed_spines), -1.0, 1.0)[:, None]
    sideways -= np.outer(sideways @ axis, axis)
    side = sideways.mean(axis=0)
    if np.linalg.norm(side) < 0.35 * np.linalg.norm(sideways, axis=1).mean():
        side = facing(np.linalg.svd(sideways, full_matrices=False)[2][0], side)
    side = unit(side)
    shots["dendrite"] = shot(
        target,
        1.05 * np.linalg.norm(seen - target, axis=1).max(),
        facing(np.cross(axis, side), whole_direction),
        side,
    )

    # one spine, seen across it and across its dendrite, its tip up, its root and the dendrite's axis there in view
    i = spine_choice
    centre = table.loc[i, CENTER].to_numpy(dtype=float) - centre_um
    direction = table.loc[i, ORIENTATION].to_numpy(dtype=float)
    host = morph_sections[int(table.loc[i, "afferent_section_id"]) - offset].points.astype(float) - centre_um
    near = host[np.linalg.norm(host - centre, axis=1) < 1.5]
    dendrite = principal_axis(near if len(near) >= 2 else host)
    dendrite = unit(dendrite - (dendrite @ direction) * direction)
    own = np.vstack([spine_points[vertex_start[i] : vertex_start[i + 1]], centre])
    target = (own.min(axis=0) + own.max(axis=0)) / 2
    reach = np.linalg.norm(own - target, axis=1).max()
    shots["spine"] = shot(
        target,
        min(3.0, max(1.5, 1.15 * reach)),
        facing(np.cross(direction, dendrite), whole_direction),
        direction,
    )
    return shots, section_id


# --- the TypeScript -------------------------------------------------------------------------------------------------


def h5_tree(path):
    """The H5's groups and datasets in the order h5py lists them (by name), with shapes, types and compression."""
    nodes = []

    def visit(name, item):
        node = {"path": f"/{name}", "kind": "dataset" if isinstance(item, h5py.Dataset) else "group"}
        if isinstance(item, h5py.Dataset):
            node["shape"] = list(item.shape)
            node["dtype"] = "string" if h5py.check_string_dtype(item.dtype) else str(item.dtype)
            if item.compression:
                node["compression"] = f"{item.compression} {item.compression_opts}"
        if item.attrs:
            node["attrs"] = {key: np.asarray(value).tolist() for key, value in item.attrs.items()}
        nodes.append(node)

    with h5py.File(path, "r") as h5:
        h5.visititems(visit)
    return nodes


def spine_table_rows(table):
    """The spine table's columns, their dtypes and every row, numbers rounded to 3 decimals and bytes decoded."""

    def value(v):
        if isinstance(v, (bytes, np.bytes_)):
            return v.decode()
        if isinstance(v, str):
            return v
        if isinstance(v, (int, np.integer)):
            return int(v)
        return num(v, 3)

    return {
        "columns": list(table.columns),
        "dtypes": ["string" if table[c].dtype == object else str(table[c].dtype) for c in table.columns],
        "rows": [[value(v) for v in row] for row in table.itertuples(index=False)],
        "rowCount": len(table),
    }


def write_typescript(h5_path, mesh_path, cell, tree, swc_head, table_head, validation):
    def js(value):
        return json.dumps(value, ensure_ascii=False, indent=2)

    lines = [
        f"// Made by scripts/learn/skeletonization_data.py from {h5_path.name} and {mesh_path.name}, with morph-spines "
        f"{version('morph-spines')}: do not edit by hand.",
        "",
        "/** One group or dataset of the spiny H5, as h5py lists it. */",
        "export interface H5Node {",
        "  path: string;",
        "  kind: 'group' | 'dataset';",
        "  shape?: readonly number[];",
        "  dtype?: string;",
        "  /** The filter and its level, e.g. 'gzip 5'. */",
        "  compression?: string;",
        "  attrs?: Readonly<Record<string, readonly number[] | number | string>>;",
        "}",
        "",
        "/** The course's cell: what it is, where it comes from, and its counts and lengths (µm). */",
        f"export const CELL = {js(cell)} as const;",
        "",
        "/** The spiny H5's groups and datasets, in the order h5py lists them (by name). */",
        f"export const H5_TREE: readonly H5Node[] = {js(tree)};",
        "",
        "/**",
        " * The first lines of the skeleton as SWC, in the file's own coordinates (µm), as morph-tool's",
        " * converter.convert(h5, swc, single_point_soma=True) writes it with MorphIO.",
        " */",
        f"export const SWC_HEAD = {js(swc_head)} as const;",
        "",
        "/** The spine table (/edges/<name>): its columns in file order, its rows, and how many rows it has. */",
        f"export const SPINE_TABLE = {js(table_head)} as const;",
        "",
        "/** What morph-spines' validate_morph_with_spines_file(path) says of the file, line by line. */",
        f"export const VALIDATION = {js(validation)} as const;",
        "",
    ]
    TS.parent.mkdir(parents=True, exist_ok=True)
    TS.write_text("\n".join(lines))
    if BIOME.exists():
        subprocess.run([str(BIOME), "format", "--write", str(TS)], cwd=ROOT, check=True, capture_output=True)
    else:
        print(f"format it: node_modules/.bin/biome format --write {TS.relative_to(ROOT)}", file=sys.stderr)


# --- the preview ----------------------------------------------------------------------------------------------------


def preview(directory, shots, layers, chosen_spine, spine_skeleton):
    """Each shot drawn with matplotlib, depth-sorted triangles under an orthographic camera framing the shot's sphere
    in the picture's height: the membrane pale and see-through, the soma amber, each spine its own colour, the
    skeleton as lines as wide as its diameter, and, in the spine shot, the chosen spine's own skeleton in white, its
    root (afferent_surface) in red and its centre (afferent_center) in yellow."""
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.collections import LineCollection, PolyCollection

    directory.mkdir(parents=True, exist_ok=True)
    skeleton_points, skeleton_segments, skeleton_starts = spine_skeleton
    a, b = skeleton_starts[chosen_spine], skeleton_starts[chosen_spine + 1]
    own_segments = skeleton_segments[(skeleton_segments[:, 0] >= a) & (skeleton_segments[:, 0] < b)]
    palette = plt.get_cmap("tab20")
    width, height, dpi = 1200, 750, 100
    starts = layers["vertexStart"]
    spine_colours = np.zeros((len(layers["spines"]), 4))
    for i in range(len(starts) - 1):
        spine_colours[starts[i] : starts[i + 1]] = palette(i % 20)
    surfaces = [
        (layers["mesh"], layers["meshTriangles"], np.array([0.86, 0.88, 0.92, 0.16]), None),
        (layers["soma"], layers["somaTriangles"], np.array([1.0, 0.75, 0.35, 0.45]), None),
        (layers["spines"], layers["spineTriangles"], None, spine_colours),
    ]
    for name, view in shots.items():
        target, radius = np.array(view["target"]), view["radius"]
        back = unit(view["direction"])
        right = unit(np.cross(view["up"], back))
        up = np.cross(back, right)
        light = unit(back + 0.4 * up + 0.3 * right)
        half_w, half_h = radius * width / height, radius
        polygons, colours, depths = [], [], []
        for points, triangles, colour, per_vertex in surfaces:
            p = points - target
            screen = np.stack([p @ right, p @ up], axis=1)
            depth = p @ back
            corners = screen[triangles]
            inside = (
                (corners[:, :, 0].max(axis=1) > -half_w)
                & (corners[:, :, 0].min(axis=1) < half_w)
                & (corners[:, :, 1].max(axis=1) > -half_h)
                & (corners[:, :, 1].min(axis=1) < half_h)
            )
            triangles = triangles[inside]
            normals = np.cross(
                points[triangles[:, 1]] - points[triangles[:, 0]], points[triangles[:, 2]] - points[triangles[:, 0]]
            )
            normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-12)
            shade = 0.35 + 0.65 * np.abs(normals @ light)
            rgba = np.tile(colour, (len(triangles), 1)) if per_vertex is None else per_vertex[triangles[:, 0]].copy()
            rgba[:, :3] *= shade[:, None]
            polygons.append(screen[triangles])
            colours.append(rgba)
            depths.append(depth[triangles].mean(axis=1))
        order = np.argsort(np.concatenate(depths), kind="stable")
        fig = plt.figure(figsize=(width / dpi, height / dpi), dpi=dpi, facecolor="#0b1020")
        ax = fig.add_axes((0, 0, 1, 1), facecolor="#0b1020")
        ax.add_collection(
            PolyCollection(np.concatenate(polygons)[order], facecolors=np.concatenate(colours)[order], linewidths=0)
        )
        px_per_um = height / (2 * radius)
        for xyzr, pairs, colour in [
            (layers["skeleton"], layers["skeletonSegments"], (0.35, 0.95, 1.0, 0.75)),
            (skeleton_points, own_segments, (1.0, 1.0, 1.0, 0.95)) if name == "spine" else (None, None, None),
        ]:
            if xyzr is None:
                continue
            p = xyzr[:, :3] - target
            screen = np.stack([p @ right, p @ up], axis=1)
            widths = np.maximum(0.8, 2 * xyzr[pairs[:, 1], 3] * px_per_um * 72 / dpi)
            ax.add_collection(LineCollection(screen[pairs], colors=[colour], linewidths=widths, capstyle="round"))
        if name == "spine":
            for key, colour in (("root", "#ff5d73"), ("centre", "#ffe066")):
                p = layers[key][chosen_spine] - target
                ax.plot([p @ right], [p @ up], "o", color=colour, markersize=7)
        ax.set_xlim(-half_w, half_w)
        ax.set_ylim(-half_h, half_h)
        ax.set_aspect("equal")
        ax.axis("off")
        ax.text(
            0.01,
            0.98,
            f"{name}: target {view['target']}, radius {view['radius']} µm, "
            f"direction {view['direction']}, up {view['up']}",
            transform=ax.transAxes,
            color="white",
            fontsize=9,
            va="top",
        )
        bar = 10 if radius > 8 else 1
        ax.plot([-half_w * 0.95, -half_w * 0.95 + bar], [-half_h * 0.93] * 2, color="white", lw=2)
        ax.text(-half_w * 0.95, -half_h * 0.9, f"{bar} µm", color="white", fontsize=9)
        out = directory / f"preview-{name}.png"
        fig.savefig(out, dpi=dpi, facecolor=fig.get_facecolor())
        plt.close(fig)
        print(f"drew {out}", file=sys.stderr)


# --- all of it ------------------------------------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--h5", type=Path, default=DATA / "864691134884740346_v1.0.h5")
    parser.add_argument("--mesh", type=Path, default=DATA / "864691134884740346.obj")
    parser.add_argument("--preview", type=Path, help="draw each camera shot to DIR/preview-<shot>.png")
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    failures = []

    # the membrane, in nm, and the centre decodeGlb will put at the origin
    mesh_nm, mesh_triangles = read_mesh(args.mesh)
    write_glb(OUT / "mesh.glb", mesh_nm, mesh_triangles, args.mesh.stem)
    glb_positions, glb_indices, centre_nm, _ = read_glb(OUT / "mesh.glb")
    box_centre = (glb_positions.min(axis=0).astype(float) + glb_positions.max(axis=0).astype(float)) / 2
    if np.abs(box_centre - centre_nm).max() >= 1 or not np.array_equal(glb_indices, mesh_triangles.reshape(-1)):
        failures.append("mesh.glb does not read back as written")
    centre_um = centre_nm * UM_PER_NM
    mesh = (glb_positions.astype(float) - centre_nm) * UM_PER_NM

    # the morphology with spines, through morph-spines
    cell = load_morphology_with_spines(str(args.h5), load_meshes=True)
    name = cell.morphology.name
    spines, table = cell.spines, cell.spines.spine_table
    morph_sections = list(cell.morphology.to_morphio().iter())

    swc_text, moved_text = skeleton_swc(cell.morphology, centre_um)
    moved_cell = morphio.Morphology(moved_text, extension="swc")
    soma_centre = moved_cell.soma.points[0].astype(float)
    header = [
        f"# Made by scripts/learn/skeletonization_data.py from {args.h5.name}: {SOURCE['title']}.",
        f"# In µm, moved by -({', '.join(f'{v:.4f}' for v in centre_um)}) into mesh.glb's frame, around the centre of "
        "the mesh's box.",
        "# Its soma is the H5's three-point contour as morph-tool converts it for SWC (single_point_soma=True).",
    ]
    (OUT / "skeleton.swc").write_text("\n".join(header) + "\n" + moved_text)
    moved_sections = [(s.is_root, s.points.astype(float) - centre_um) for s in morph_sections]
    swc_order = swc_matches_morphio(moved_text, moved_sections, soma_centre)
    if not swc_order:
        failures.append("parseSwc's sections of skeleton.swc are not MorphIO's")

    offset, offset_medians = section_id_offset(
        morph_sections, table[CENTER].to_numpy(dtype=float), table["afferent_section_id"].to_numpy(dtype=int)
    )

    # the spines' meshes, placed and in their own frames, in table order
    count = spines.spine_count
    placed, local, triangles = [], [], []
    vertex_start, triangle_start = [0], [0]
    for i in range(count):
        points = spines.spine_mesh_points(i)
        placed.append(points - centre_um)
        local.append(spines.centered_mesh_points(i))
        triangles.append(np.asarray(spines.spine_mesh_triangles(i)) + vertex_start[-1])
        vertex_start.append(vertex_start[-1] + len(points))
        triangle_start.append(triangle_start[-1] + len(triangles[-1]))
    placed, local, triangles = np.vstack(placed), np.vstack(local), np.vstack(triangles)
    skeleton_points, skeleton_segments, skeleton_starts = spine_skeletons(spines)
    skeleton_points[:, :3] -= centre_um
    translation = np.array([spines.spine_transformations(i)[1] for i in range(count)]) - centre_um

    arrays = [
        ("spinePositions", "f32", 3, placed),
        ("spineLocalPositions", "f32", 3, local),
        ("spineIndices", "u32", 3, triangles),
        ("spineVertexStart", "u32", 1, vertex_start),
        ("spineTriangleStart", "u32", 1, triangle_start),
        ("spineRoot", "f32", 3, table[SURFACE].to_numpy(dtype=float) - centre_um),
        ("spineCentre", "f32", 3, table[CENTER].to_numpy(dtype=float) - centre_um),
        ("spineDirection", "f32", 3, table[ORIENTATION].to_numpy(dtype=float)),
        ("spineRotation", "f32", 4, table[ROTATION].to_numpy(dtype=float)),
        ("spineTranslation", "f32", 3, translation),
        ("spineLength", "f32", 1, table["spine_length"].to_numpy(dtype=float)),
        ("spineSection", "i32", 1, table["afferent_section_id"].to_numpy()),
        ("spineSectionPos", "f32", 1, table["afferent_section_pos"].to_numpy(dtype=float)),
        ("spineSkeletonPoints", "f32", 4, skeleton_points),
        ("spineSkeletonSegments", "u32", 2, skeleton_segments),
        ("spineSkeletonPointStart", "u32", 1, skeleton_starts),
        ("somaPositions", "f32", 3, cell.soma.soma_mesh_points - centre_um),
        ("somaIndices", "u32", 3, cell.soma.soma_mesh_triangles),
    ]
    dtypes = {"f32": "<f4", "u32": "<u4", "i32": "<i4", "u8": "u1"}
    blob, layout, typed = bytearray(), {}, {}
    for key, kind, size, values in arrays:
        data = np.ascontiguousarray(np.asarray(values).reshape(-1), dtype=dtypes[kind])
        blob += b"\0" * (-len(blob) % 4)
        layout[key] = {"type": kind, "offset": len(blob), "length": len(data), "itemSize": size}
        blob += data.tobytes()
        typed[key] = data.reshape(-1, size) if size > 1 else data
    (OUT / "spines.bin").write_bytes(bytes(blob))

    # the frame: each spine's own mesh, turned by its rotation and moved by its translation, is its placed mesh
    frame_error, quaternion_error = 0.0, 0.0
    for i in range(count):
        a, b = vertex_start[i], vertex_start[i + 1]
        quaternion = typed["spineRotation"][i].astype(float)
        quaternion_error = max(quaternion_error, abs(np.linalg.norm(quaternion) - 1))
        moved = Rotation.from_quat(quaternion).apply(typed["spineLocalPositions"][a:b].astype(float))
        moved += typed["spineTranslation"][i].astype(float)
        frame_error = max(frame_error, float(np.linalg.norm(moved - typed["spinePositions"][a:b], axis=1).max()))
    if frame_error >= 1e-4:
        failures.append(f"frame check: {frame_error:.3g} µm")

    # Which way each spine's frame faces. The format puts its origin near the root (morph-spines' word), with +y
    # towards the tip; in this file about half the spines have it the other way round: the end at y = spine_length
    # touches their section, and afferent_surface lies nearer the free end.
    lengths = table["spine_length"].to_numpy(dtype=float)
    roots = table[SURFACE].to_numpy(dtype=float) - centre_um
    tips = roots + table[ORIENTATION].to_numpy(dtype=float) * lengths[:, None]
    hosts = [morph_sections[s - offset].points.astype(float) - centre_um for s in table["afferent_section_id"]]
    reversed_spines = [
        i for i in range(count) if polyline_distance(tips[i], hosts[i]) < polyline_distance(roots[i], hosts[i])
    ]

    # Each mesh, in its own frame, runs up to y = spine_length and down past the origin, which is not its lowest point;
    # a turned-round row's origin is nearer its free end, the lowest y, than its dendrite, at y = spine_length.
    lows = np.array([local[vertex_start[i] : vertex_start[i + 1], 1].min() for i in range(count)], dtype=float)
    highs = np.array([local[vertex_start[i] : vertex_start[i + 1], 1].max() for i in range(count)], dtype=float)
    if np.abs(highs - lengths).max() >= 1e-3:
        failures.append(f"spine meshes' tops {np.abs(highs - lengths).max():.3g} µm off spine_length")
    if (lows >= 0).any():
        failures.append(f"spines {np.flatnonzero(lows >= 0).tolist()} do not reach below their origin")
    if far := [i for i in reversed_spines if -lows[i] >= highs[i]]:
        failures.append(f"turned-round spines {far} have their origin nearer their dendrite")

    # Which spine to show close up: of those at least SPINE_UM long whose frames face the way the format says and whose
    # own skeletons are lines inside their meshes, the one whose far half is widest for its narrowest near half, so a
    # thin neck and a wider head show (the file does not say which is which). Some spines' own skeletons are a single
    # point, a few of them outside the mesh.
    profiles = [neck_and_head(local[vertex_start[i] : vertex_start[i + 1]], lengths[i]) for i in range(count)]
    forks = [branches(skeleton_segments, skeleton_starts[i], skeleton_starts[i + 1]) for i in range(count)]
    skeleton_sizes = np.diff(skeleton_starts)
    skeleton_gaps = [
        float(
            np.median(
                cKDTree(placed[vertex_start[i] : vertex_start[i + 1]]).query(
                    skeleton_points[skeleton_starts[i] : skeleton_starts[i + 1], :3]
                )[0]
            )
        )
        for i in range(count)
    ]
    candidates = [
        i
        for i in range(count)
        if lengths[i] >= SPINE_UM and i not in reversed_spines and skeleton_sizes[i] >= 10 and skeleton_gaps[i] < 0.3
    ]
    chosen_spine = max(candidates, key=lambda i: (profiles[i][1] / profiles[i][0], -i))

    # the layers in the recentred frame, for the shots, the checks and the preview
    skeleton = np.vstack([points for _, points in moved_sections])
    skeleton_radius = np.concatenate([s.diameters / 2 for s in morph_sections])
    starts = np.cumsum([0] + [len(s.points) for s in morph_sections])
    skeleton_pairs = np.array(
        [(k, k + 1) for a, b in zip(starts[:-1], starts[1:], strict=True) for k in range(a, b - 1)]
    )
    layers = {
        "mesh": mesh,
        "meshTriangles": mesh_triangles,
        "soma": typed["somaPositions"].astype(float),
        "somaTriangles": typed["somaIndices"].astype(np.int64),
        "spines": typed["spinePositions"].astype(float),
        "spineTriangles": typed["spineIndices"].astype(np.int64),
        "vertexStart": np.array(vertex_start),
        "skeleton": np.column_stack([skeleton, skeleton_radius]),
        "skeletonSegments": skeleton_pairs,
        "root": typed["spineRoot"].astype(float),
        "centre": typed["spineCentre"].astype(float),
    }
    shots, chosen_section = make_shots(layers, morph_sections, table, offset, chosen_spine, reversed_spines, centre_um)

    # how well the layers line up: spines on the membrane, the skeleton about a radius inside it
    tree = cKDTree(mesh)
    spine_gap = float(np.median(tree.query(layers["spines"])[0]))
    skeleton_gap = tree.query(skeleton)[0]
    skeleton_ratio = float(np.median(skeleton_gap / np.maximum(skeleton_radius, 0.05)))
    if spine_gap >= 1:
        failures.append(f"spines {spine_gap:.3f} µm from the membrane")
    if not 0.3 < skeleton_ratio < 3:
        failures.append(f"skeleton {skeleton_ratio:.2f} radii from the membrane")
    own_gap = float(np.median(skeleton_gaps))
    one_point = [i for i in range(count) if skeleton_sizes[i] == 1]
    outside = [i for i in range(count) if skeleton_gaps[i] >= 0.5]

    with h5py.File(args.h5, "r") as h5:
        group = h5[f"spines/meshes/{name}"]
        head_neck = "head_neck_values" in group and group["offsets"].shape[1] >= 3
        stored_spine_vertices = group["vertices"].shape[0]
        stored_skeleton_points = h5[f"spines/skeletons/{name}/points"].shape[0]
        stored_skeleton_sections = h5[f"spines/skeletons/{name}/structure"].shape[0]
        skeleton_rows = h5[f"morphology/{name}/points"].shape[0]
    optional = [c for c in OPTIONAL if c in table.columns]
    total_length = float(neurom.get("total_length", cell.morphology))
    sections_with_spines = int(table["afferent_section_id"].nunique())

    counts = {
        "meshVertices": len(mesh),
        "meshTriangles": len(mesh_triangles),
        "skeletonPoints": skeleton_rows,
        "skeletonSections": len(morph_sections),
        "swcSamples": sum(1 for line in moved_text.splitlines() if line.strip() and not line.startswith("#")),
        "spines": count,
        "spineMeshVertices": len(placed),
        "spineMeshVerticesInFile": stored_spine_vertices,
        "spineMeshTriangles": len(triangles),
        "spineSkeletonPoints": len(skeleton_points),
        "spineSkeletonPointsInFile": stored_skeleton_points,
        "spineSkeletonSections": stored_skeleton_sections,
        "somaMeshVertices": len(layers["soma"]),
        "somaMeshTriangles": len(layers["somaTriangles"]),
    }
    description = {
        "name": name,
        "source": SOURCE,
        "units": "µm",
        "frame": "µm, around the centre of mesh.glb's box (decodeGlb's frame): subtract centreNm / 1000 from the H5's "
        "coordinates",
        "centreNm": vec(centre_nm, 3),
        "bounds": {
            "mesh": box(mesh),
            "skeleton": box(skeleton),
            "spines": box(layers["spines"]),
            "soma": box(layers["soma"]),
            "all": box(np.vstack([mesh, skeleton, layers["spines"]])),
        },
        "counts": counts,
        "spineLengthRange": vec([lengths.min(), lengths.max()]),
        "headNeck": bool(head_neck),
        "optionalColumns": optional,
        "sectionIdOffset": offset,
        "sectionIdCheck": {
            "rule": "MorphIO section index = afferent_section_id - sectionIdOffset; median distance (µm) from "
            "afferent_center to that section, for each offset tried",
            "medianDistance": {str(k): (None if math.isinf(v) else num(v)) for k, v in offset_medians.items()},
        },
        "swcSectionOrderMatchesMorphio": swc_order,
        "reversedSpines": reversed_spines,
        "reversedSpinesNote": "table rows whose frame faces the other way to the format's: their tip (spineRoot + "
        "spineDirection * spineLength, local y = spineLength) is nearer their section than their root "
        "(afferent_surface, the local origin), which lies nearer the spine's free end",
        "frameMaxError": float(f"{frame_error:.3g}"),
        "frameConvention": "spinePositions = rotate(spineRotation, spineLocalPositions) + spineTranslation, the "
        "quaternion x, y, z, w (scipy's Rotation.from_quat, three.js Quaternion); spineTranslation is "
        "afferent_surface",
        "checks": {
            "spineToMeshMedian": num(spine_gap),
            "skeletonToMeshMedian": num(np.median(skeleton_gap)),
            "skeletonRadiusMedian": num(np.median(skeleton_radius)),
            "spineSkeletonToOwnMeshMedian": num(own_gap),
            "spinesWithOnePointSkeleton": one_point,
            "spinesWithSkeletonOutsideMesh": outside,
            "quaternionNormMaxError": float(f"{quaternion_error:.3g}"),
        },
        "shots": shots,
        "shotsNote": "direction: unit vector from target to camera; radius: the subject fits in a sphere of this "
        "radius (µm) around target",
        "chosen": {"spine": int(chosen_spine), "section": chosen_section},
        "arraysNote": "spines.bin, little-endian; offset in bytes, length in values; itemSize values per item. "
        "Spine i's vertices are items spineVertexStart[i] to spineVertexStart[i + 1], its triangles "
        "spineTriangleStart[i] to spineTriangleStart[i + 1] (indices into all spines' vertices); its skeleton's "
        "points spineSkeletonPointStart[i] to spineSkeletonPointStart[i + 1]",
        "arrays": layout,
    }
    (OUT / "cell.json").write_text(json.dumps(description, ensure_ascii=False, indent=2) + "\n")

    # the TypeScript facts
    validation = str(validate_morph_with_spines_file(args.h5)).splitlines()
    facts = {
        "name": name,
        "caption": f"{SOURCE['title']} ({SOURCE['licence']}). {SOURCE['credit']}.",
        "source": SOURCE,
        "files": {"h5": args.h5.name, "mesh": args.mesh.name},
        "counts": counts,
        "totalLength": num(total_length, 2),
        "sections": int(neurom.get("number_of_sections", cell.morphology)),
        "sectionsWithSpines": sections_with_spines,
        "spinesPerUm": num(count / total_length, 3),
        "spineLengthRange": vec([lengths.min(), lengths.max()], 2),
        "headNeck": bool(head_neck),
        "optionalColumns": optional,
        "sectionIdOffset": offset,
        "reversedSpines": len(reversed_spines),
        "reversedRows": [int(i) for i in reversed_spines],
        "belowOrigin": vec([-lows.max(), -lows.min()], 2),
        "chosen": {"spine": int(chosen_spine), "section": chosen_section},
        "soma": {
            "contourPoints": len(cell.morphology.to_morphio().soma.points),
            "swcRadius": num(moved_cell.soma.diameters[0] / 2, 3),
        },
    }
    write_typescript(
        args.h5, args.mesh, facts, h5_tree(args.h5), swc_text.splitlines()[:14], spine_table_rows(table), validation
    )

    if args.preview:
        preview(args.preview, shots, layers, chosen_spine, (skeleton_points, skeleton_segments, skeleton_starts))

    size = sum(f.stat().st_size for f in OUT.iterdir() if f.is_file())
    if size >= 3 * 2**20:
        failures.append(f"{OUT.relative_to(ROOT)} is {size / 2**20:.2f} MB")
    print(
        "\n".join(
            [
                f"{name}: {count} spines on {sections_with_spines} of {len(morph_sections)} sections, "
                f"{total_length:.2f} µm of skeleton",
                f"centre {vec(centre_nm, 3)} nm; GLB centre read back {vec(box_centre, 3)} nm",
                f"spines to the membrane: median {spine_gap:.3f} µm (each spine vertex to its nearest mesh vertex)",
                f"skeleton to the membrane: median {np.median(skeleton_gap):.3f} µm, median radius "
                f"{np.median(skeleton_radius):.3f} µm, median ratio {skeleton_ratio:.2f}",
                f"spines' own skeletons to their meshes: median {own_gap:.3f} µm; a single point for spines "
                f"{one_point}; median 0.5 µm or more outside their mesh for spines {outside}",
                f"frame check: max {frame_error:.3g} µm; quaternion norms within {quaternion_error:.3g} of 1",
                f"afferent_section_id - {offset} is MorphIO's section (median distances by offset {offset_medians})",
                f"parseSwc's sections match MorphIO's, in order: {swc_order}",
                f"head/neck split: {head_neck}; optional columns: {optional or 'none'}",
                f"frames facing into the dendrite (afferent_surface nearer the free end): spines {reversed_spines}",
                f"spine meshes reach {-lows.max():.2f} to {-lows.min():.2f} µm below their origin, up to spine_length",
                "spine profiles (neck, head width µm; forks of its own skeleton): "
                + ", ".join(f"{i}: {n:.2f}/{h:.2f}/{forks[i]}" for i, (n, h) in enumerate(profiles)),
                f"chosen spine {chosen_spine} (length {lengths[chosen_spine]:.2f} µm), section {chosen_section}",
                f"{OUT.relative_to(ROOT)}: "
                + ", ".join(f"{f.name} {f.stat().st_size / 1024:.0f} KB" for f in sorted(OUT.iterdir()))
                + f"; {size / 2**20:.2f} MB in all",
            ]
        )
    )
    if failures:
        raise SystemExit("failed: " + "; ".join(failures))


if __name__ == "__main__":
    main()
