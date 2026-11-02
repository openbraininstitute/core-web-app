"""Runs the Python cells of the course "Skeletonized morphologies and their spines", in order, in one session, on the
course's example cell, and writes each one's code and what it printed to the course figure's cells.ts.

The example is morph-spines' own (https://github.com/openbraininstitute/morph-spines, examples/data/), a piece of
MICrONS neuron 864691134884740346 in morph-spines' H5 format, the format of the skeletonization workflow's spiny H5.
The cells read a copy of it in a temporary directory, under its own name, as a file fetched with entitysdk would be
read; the fetching itself needs a login to the platform, so the course shows that code without running it.

Needs morph-spines, MorphIO, NeuroM and morph-tool (obi-one's virtual environment has them all). The input defaults to
../data/morph-spines/ beside the repository, as for skeletonization_data.py. From the repository's root:

    python scripts/learn/skeletonization_cells.py [--h5 FILE]

It formats the file it writes with the repository's Biome. If node_modules/.bin/biome is missing, format it by hand:
node_modules/.bin/biome format --write src/features/learn/components/courses/skeleton/cells.ts
"""

import argparse
import ctypes
import json
import os
import shutil
import subprocess
import sys
import tempfile
from importlib.metadata import version
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT.parent / "data" / "morph-spines"
CELL_JSON = ROOT / "public/static/learn/skeletonization/cell.json"
OUT = ROOT / "src/features/learn/components/courses/skeleton/cells.ts"
BIOME = ROOT / "node_modules/.bin/biome"

# the spine and the section the course's figure shows close up (cell.json's chosen), checked against it below
SPINE, SECTION = 17, 9

# (key, file name, the lines to light: what is new in it, code)
CELLS = [
    (
        "load",
        "load.py",
        [3],
        """from morph_spines import load_morphology_with_spines

m = load_morphology_with_spines(str(path))     # path: the spiny H5

for part in (m.morphology, m.soma, m.spines):
    print(type(part).__module__, type(part).__name__)
print(m.morphology.name, "·", len(m.morphology.sections), "sections,",
      m.spines.spine_count, "spines")
print({n.type.name for n in m.morphology.neurites})
print("soma mesh centre:", m.soma.center.round(2), "µm")""",
    ),
    (
        "table",
        "table.py",
        [3, 7, 10, 11],
        """import neurom as nm

t = m.spines.spine_table          # a pandas DataFrame, a row per spine
print(t.shape)
print(t[["afferent_section_id", "spine_length"]].head(2).round(3))

per_section = t["afferent_section_id"].value_counts()
print("most spines:", per_section.head(3).to_dict())

on_9 = m.spines.spine_indices_for_section(9)
section = m.morphology.sections[9 - 1]   # the table counts the soma as 0
print("section 9:", round(section.length, 2), "µm, spines", on_9.tolist())

length = nm.get("total_length", m.morphology)    # µm
print(round(m.spines.spine_count / length, 3), "spines per µm")""",
    ),
    (
        "meshes",
        "meshes.py",
        [2, 7, 11, 17, 20],
        """i = 17
mesh = m.spines.spine_mesh(i)              # a trimesh, on the cell
print(len(mesh.faces), "triangles,", len(mesh.vertices), "vertices")
stored = m.spines.spine_mesh_points(i)     # the file's own vertices
print(len(stored), "as stored: trimesh merges the repeats")

local = m.spines.centered_spine_mesh(i)    # in the spine's own frame
print("own frame: y from", local.bounds[:, 1].round(2),
      "· length", round(t.loc[i, "spine_length"], 2))

rotation, translation = m.spines.spine_transformations(i)
print("quaternion (x, y, z, w):", rotation.as_quat().round(3))
print("+y turns to", rotation.apply([0, 1, 0]).round(3),
      "at", translation.round(2))

section = t.loc[i, "afferent_section_id"]
together = m.spines.compound_spine_mesh_for_section(section)
print(f"section {section}'s spines:", len(together.faces), "triangles")

neckless = m.spines.spine_mesh(i, include_neck=False)
print("without its neck:", len(neckless.faces), "triangles")  # none marked""",
    ),
    (
        "skeleton",
        "skeleton.py",
        [3, 4, 6, 10, 17],
        """import morphio

cell = m.morphology                        # a NeuroM Morphology
print(round(nm.get("total_length", cell), 2), "µm in",
      nm.get("number_of_sections", cell), "sections")
for kind in (nm.BASAL_DENDRITE, nm.APICAL_DENDRITE, nm.AXON):
    total = nm.get("total_length", cell, neurite_type=kind)
    print(" ", kind.name, round(total, 2), "µm")

raw = morphio.Collection(str(path)).load(f"morphology/{cell.name}")
print(raw.soma_type.name, "of", len(raw.soma.points), "points")
first = raw.sections[0]
print("section 0:", len(first.points), "points, diameters",
      first.diameters[:3].round(2))

try:
    morphio.Morphology(path)        # the file's root holds no morphology
except morphio.RawDataError as error:
    print("morphio.Morphology(path):", error)""",
    ),
    (
        "convert",
        "convert.py",
        [4, 6, 9, 10],
        """from morph_tool.converter import convert

out = path.parent
plain = raw.as_mutable()                   # MorphIO's editable copy
for ext in ("h5", "asc", "swc"):
    plain.write(out / f"skeleton.{ext}")   # .swc: MorphIO warns of the soma
# morph-tool turns the contour into a stack of cylinders, as NEURON
# does, and can make that one sphere of the same surface
convert(out / "skeleton.h5", out / "converted.swc")
convert(out / "skeleton.h5", out / "sphere.swc", single_point_soma=True)

for f in sorted(out.iterdir()):
    print(f"{f.name:28}{f.stat().st_size:>8} bytes")
names = ("skeleton.asc", "skeleton.swc", "converted.swc", "sphere.swc")
for name in names:
    soma = nm.load_morphology(out / name).soma     # its radius in µm
    print(f"{name:14}", type(soma).__name__, round(soma.radius, 2))""",
    ),
    (
        "validate",
        "validate.py",
        [3, 6],
        """from morph_spines import validate_morph_with_spines_file

report = validate_morph_with_spines_file(path, check_data_integrity=True)
print(report)

other = validate_morph_with_spines_file(out / "skeleton.h5")
print("skeleton.h5 valid:", other.is_valid, "·", other.errors[0])""",
    ),
]


def run(path):
    """Each cell run in one namespace, `path` the spiny H5, with what it printed (C's stdout included)."""
    libc = ctypes.CDLL(None)
    namespace = {"path": path}
    entries = []
    for key, label, lit, code in CELLS:
        sys.stdout.flush()
        libc.fflush(None)
        with tempfile.TemporaryFile() as caught:
            kept = os.dup(1)
            os.dup2(caught.fileno(), 1)
            try:
                exec(compile(code, label, "exec"), namespace)
            finally:
                sys.stdout.flush()
                libc.fflush(None)
                os.dup2(kept, 1)
                os.close(kept)
            caught.seek(0)
            output = caught.read().decode().strip("\n")
        entries.append((key, label, lit, code, output))
        print(f"ran {label}", file=sys.stderr)
    return entries


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--h5", type=Path, default=DATA / "864691134884740346_v1.0.h5")
    args = parser.parse_args()

    chosen = json.loads(CELL_JSON.read_text())["chosen"]
    if (chosen["spine"], chosen["section"]) != (SPINE, SECTION):
        sys.exit(f"cell.json's chosen spine and section are {chosen}: change SPINE, SECTION and the cells to match")

    versions = {name: version(name) for name in ("morph-spines", "neurom", "morphio", "morph-tool")}
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / args.h5.name
        shutil.copy(args.h5, path)
        entries = run(path)

    lines = [
        f"// Made by scripts/learn/skeletonization_cells.py, with morph-spines {versions['morph-spines']}, NeuroM "
        f"{versions['neurom']}, MorphIO {versions['morphio']} and morph-tool {versions['morph-tool']}: do not edit "
        "by hand.",
        "import type { Cell } from '../ui/Runnable';",
        "",
        f"export const MORPH_SPINES_VERSION = {json.dumps(versions['morph-spines'])};",
        f"export const NEUROM_VERSION = {json.dumps(versions['neurom'])};",
        f"export const MORPHIO_VERSION = {json.dumps(versions['morphio'])};",
        f"export const MORPH_TOOL_VERSION = {json.dumps(versions['morph-tool'])};",
        "",
        "/** The course's Python cells, as run on its example cell, and what each printed. */",
        "export const CELLS = {",
    ]
    for key, label, lit, code, output in entries:
        lines += [
            f"  {key}: {{",
            f"    label: {json.dumps(label)},",
            f"    lit: {json.dumps(lit)},",
            f"    code: {json.dumps(code, ensure_ascii=False)},",
            f"    output: {json.dumps(output, ensure_ascii=False)},",
            "  },",
        ]
    lines += ["} satisfies Record<string, Cell>;", ""]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines))
    if BIOME.exists():
        subprocess.run([str(BIOME), "format", "--write", str(OUT)], cwd=ROOT, check=True, capture_output=True)
    else:
        print(f"format it: node_modules/.bin/biome format --write {OUT.relative_to(ROOT)}", file=sys.stderr)
    print(f"wrote {OUT.relative_to(ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
