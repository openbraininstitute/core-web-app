// Made by scripts/learn/skeletonization_cells.py, with morph-spines 1.1.0, NeuroM 4.0.5, MorphIO 3.4.2 and morph-tool 2.11.3: do not edit by hand.
import type { Cell } from '../ui/Runnable';

export const MORPH_SPINES_VERSION = '1.1.0';
export const NEUROM_VERSION = '4.0.5';
export const MORPHIO_VERSION = '3.4.2';
export const MORPH_TOOL_VERSION = '2.11.3';

/** The course's Python cells, as run on its example cell, and what each printed. */
export const CELLS = {
  load: {
    label: 'load.py',
    lit: [3],
    code: 'from morph_spines import load_morphology_with_spines\n\nm = load_morphology_with_spines(str(path))     # path: the spiny H5\n\nfor part in (m.morphology, m.soma, m.spines):\n    print(type(part).__module__, type(part).__name__)\nprint(m.morphology.name, "·", len(m.morphology.sections), "sections,",\n      m.spines.spine_count, "spines")\nprint({n.type.name for n in m.morphology.neurites})\nprint("soma mesh centre:", m.soma.center.round(2), "µm")',
    output:
      "neurom.core.morphology Morphology\nmorph_spines.core.soma Soma\nmorph_spines.core.spines Spines\n864691134884740346 · 11 sections, 24 spines\n{'basal_dendrite'}\nsoma mesh centre: [410.2  445.95 965.84] µm",
  },
  table: {
    label: 'table.py',
    lit: [3, 7, 10, 11],
    code: 'import neurom as nm\n\nt = m.spines.spine_table          # a pandas DataFrame, a row per spine\nprint(t.shape)\nprint(t[["afferent_section_id", "spine_length"]].head(2).round(3))\n\nper_section = t["afferent_section_id"].value_counts()\nprint("most spines:", per_section.head(3).to_dict())\n\non_9 = m.spines.spine_indices_for_section(9)\nsection = m.morphology.sections[9 - 1]   # the table counts the soma as 0\nprint("section 9:", round(section.length, 2), "µm, spines", on_9.tolist())\n\nlength = nm.get("total_length", m.morphology)    # µm\nprint(round(m.spines.spine_count / length, 3), "spines per µm")',
    output:
      '(24, 20)\n   afferent_section_id  spine_length\n0                    2         1.737\n1                    2         2.824\nmost spines: {9: 6, 8: 5, 11: 3}\nsection 9: 3.99 µm, spines [9, 10, 11, 12, 13, 14]\n0.315 spines per µm',
  },
  meshes: {
    label: 'meshes.py',
    lit: [2, 7, 11, 17, 20],
    code: 'i = 17\nmesh = m.spines.spine_mesh(i)              # a trimesh, on the cell\nprint(len(mesh.faces), "triangles,", len(mesh.vertices), "vertices")\nstored = m.spines.spine_mesh_points(i)     # the file\'s own vertices\nprint(len(stored), "as stored: trimesh merges the repeats")\n\nlocal = m.spines.centered_spine_mesh(i)    # in the spine\'s own frame\nprint("own frame: y from", local.bounds[:, 1].round(2),\n      "· length", round(t.loc[i, "spine_length"], 2))\n\nrotation, translation = m.spines.spine_transformations(i)\nprint("quaternion (x, y, z, w):", rotation.as_quat().round(3))\nprint("+y turns to", rotation.apply([0, 1, 0]).round(3),\n      "at", translation.round(2))\n\nsection = t.loc[i, "afferent_section_id"]\ntogether = m.spines.compound_spine_mesh_for_section(section)\nprint(f"section {section}\'s spines:", len(together.faces), "triangles")\n\nneckless = m.spines.spine_mesh(i, include_neck=False)\nprint("without its neck:", len(neckless.faces), "triangles")  # none marked',
    output:
      "1296 triangles, 285 vertices\n650 as stored: trimesh merges the repeats\nown frame: y from [-0.52  1.04] · length 1.04\nquaternion (x, y, z, w): [ 0.555 -0.105  0.154  0.811]\n+y turns to [-0.366  0.337  0.867] at [421.48 463.98 967.3 ]\nsection 8's spines: 5976 triangles\nwithout its neck: 1296 triangles",
  },
  skeleton: {
    label: 'skeleton.py',
    lit: [3, 4, 6, 10, 17],
    code: 'import morphio\n\ncell = m.morphology                        # a NeuroM Morphology\nprint(round(nm.get("total_length", cell), 2), "µm in",\n      nm.get("number_of_sections", cell), "sections")\nfor kind in (nm.BASAL_DENDRITE, nm.APICAL_DENDRITE, nm.AXON):\n    total = nm.get("total_length", cell, neurite_type=kind)\n    print(" ", kind.name, round(total, 2), "µm")\n\nraw = morphio.Collection(str(path)).load(f"morphology/{cell.name}")\nprint(raw.soma_type.name, "of", len(raw.soma.points), "points")\nfirst = raw.sections[0]\nprint("section 0:", len(first.points), "points, diameters",\n      first.diameters[:3].round(2))\n\ntry:\n    morphio.Morphology(path)        # the file\'s root holds no morphology\nexcept morphio.RawDataError as error:\n    print("morphio.Morphology(path):", error)',
    output:
      '76.07 µm in 11 sections\n  basal_dendrite 76.07 µm\n  apical_dendrite 0 µm\n  axon 0 µm\nSOMA_SIMPLE_CONTOUR of 3 points\nsection 0: 13 points, diameters [2.05 1.68 1.57]\nmorphio.Morphology(path): Missing points or structure datasets, cannot load morphology without them',
  },
  convert: {
    label: 'convert.py',
    lit: [4, 6, 9, 10],
    code: 'from morph_tool.converter import convert\n\nout = path.parent\nplain = raw.as_mutable()                   # MorphIO\'s editable copy\nfor ext in ("h5", "asc", "swc"):\n    plain.write(out / f"skeleton.{ext}")   # .swc: MorphIO warns of the soma\n# morph-tool turns the contour into a stack of cylinders, as NEURON\n# does, and can make that one sphere of the same surface\nconvert(out / "skeleton.h5", out / "converted.swc")\nconvert(out / "skeleton.h5", out / "sphere.swc", single_point_soma=True)\n\nfor f in sorted(out.iterdir()):\n    print(f"{f.name:28}{f.stat().st_size:>8} bytes")\nnames = ("skeleton.asc", "skeleton.swc", "converted.swc", "sphere.swc")\nfor name in names:\n    soma = nm.load_morphology(out / name).soma     # its radius in µm\n    print(f"{name:14}", type(soma).__name__, round(soma.radius, 2))',
    output:
      '864691134884740346_v1.0.h5    654013 bytes\nconverted.swc                  26974 bytes\nskeleton.asc                   19102 bytes\nskeleton.h5                    15280 bytes\nskeleton.swc                   25480 bytes\nsphere.swc                     25314 bytes\nskeleton.asc   SomaSimpleContour 6.49\nskeleton.swc   SomaCylinders 0.0\nconverted.swc  SomaCylinders 4.37\nsphere.swc     SomaSinglePoint 4.37',
  },
  validate: {
    label: 'validate.py',
    lit: [3, 6],
    code: 'from morph_spines import validate_morph_with_spines_file\n\nreport = validate_morph_with_spines_file(path, check_data_integrity=True)\nprint(report)\n\nother = validate_morph_with_spines_file(out / "skeleton.h5")\nprint("skeleton.h5 valid:", other.is_valid, "·", other.errors[0])',
    output:
      "Validation result: VALID (checked: structure + data integrity)\n  Info (5):\n    - /morphology contains 1 neuron(s): ['864691134884740346']\n    - /edges contains 1 spine table(s): ['864691134884740346']\n    - /spines/skeletons contains 1 group(s): ['864691134884740346']\n    - /spines/meshes contains 1 group(s): ['864691134884740346']\n    - /soma/meshes contains 1 mesh(es): ['864691134884740346']\n  Warnings (4):\n    - /morphology/864691134884740346: missing 'metadata' subgroup\n    - /morphology/864691134884740346/points: expected float32, got float64\n    - /spines/skeletons/864691134884740346: missing 'metadata' subgroup\n    - /spines/skeletons/864691134884740346/points: expected float32, got float64\nskeleton.h5 valid: False · Missing mandatory top-level group: /morphology",
  },
} satisfies Record<string, Cell>;
