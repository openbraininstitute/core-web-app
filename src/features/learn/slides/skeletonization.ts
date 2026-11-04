import { CELL } from '@/features/learn/components/courses/skeleton/files';

import type { Slide } from '@/features/learn/components/walkthrough/Walkthrough';

const count = (n: number) => n.toLocaleString('en-GB');

/**
 * Skeletonized morphologies and their spines, on one real neuron from mouse visual cortex: its
 * membrane as an EM mesh, the skeleton made from it and the spines kept beside it, in 3D; then how
 * the platform's skeletonization makes them, the files it writes and registers, what is inside the
 * spiny H5, and how to use them in Python.
 */
export const SKELETONIZATION_SLIDES: Slide[] = [
  {
    say: 'One neuron, three ways: its membrane, its skeleton and its spines',
    note: `A piece of a real cell from mouse visual cortex: MICrONS neuron ${CELL.name}, from the examples of morph-spines. Drag to turn it.`,
    section: 'One cell, three ways',
    widget: 'skeleton:intro',
  },
  {
    say: 'An EM cell mesh is the membrane as triangles',
    note: `It is traced through a stack of electron micrographs, and kept in nanometres: ${count(CELL.counts.meshTriangles)} triangles for this piece of cell.`,
    widget: 'skeleton:mesh',
  },
  {
    say: 'Skeletonization turns it into a morphology: a tree of points, each with a radius',
    note: `Coloured by type: the soma, and ${CELL.sections} sections of basal dendrite, ${CELL.totalLength} µm in all. The skeleton has three stems: the short stubs off the mesh's soma have none.`,
    widget: 'skeleton:skeleton',
  },
  {
    say: 'The spines are segmented off the dendrites and kept as meshes of their own',
    note: `Each is placed where it grew: ${CELL.counts.spines} spines on this piece of cell, about one every ${Math.round(1 / CELL.spinesPerUm)} µm of dendrite.`,
    widget: 'skeleton:spines',
  },
  {
    say: 'One spine close up: a thin neck and a head, where an excitatory synapse usually sits',
    note: 'For each spine the file keeps its mesh, its own small skeleton, the point where it leaves the dendrite and the way it points. It does not mark which triangles are neck and which head: the colours show the distance from the dendrite.',
    widget: 'skeleton:spine',
  },
  {
    say: 'Compared with the mesh: drag the line',
    note: "The skeleton runs down the middle of each branch, and the spines fill the membrane's own bumps.",
    widget: 'skeleton:compare',
  },
  {
    say: 'On the platform, skeletonization is a workflow: from EM meshes to morphologies',
    note: 'In Workflows, under Process data: EM mesh skeletonization. It makes a Skeletonization Campaign in obi-one, a task config for each mesh and setting, and a job for each config, which runs Ultraliser.',
    section: 'The skeletonization workflow',
    widget: 'skeleton:workflow',
  },
  {
    say: 'The campaign is set by the meshes, two voxel sizes, and whether to keep the full-resolution spines',
    note: 'A list of voxel sizes sweeps them, one task config for each value. obi-one PR #1141 proposes two more fields: one to keep small branches that are not spines, one to repair slicing artifacts.',
    widget: 'skeleton:params',
  },
  {
    say: "The same campaign can be launched with obi-one's REST API",
    note: 'Generate the grid, find its task configs, estimate the cost, launch one, and follow the job. It needs a login, so the code is shown here, not run.',
    widget: 'skeleton:launch',
  },
  {
    say: 'A run writes the spiny H5, and the skeleton as SWC, H5 and ASC',
    note: 'Each becomes an asset of the new morphology: the spiny H5 labelled morphology_with_spines, the other three morphology.',
    widget: 'skeleton:outputs',
  },
  {
    say: 'What is registered: a CellMorphology with segmented spines, derived from the EM dataset',
    note: "It takes the mesh's subject and brain region, the 'Ultraliser skeletonization' protocol and a CC BY-NC 4.0 licence. Nothing is registered unless the run is tracked.",
    widget: 'skeleton:registered',
  },
  {
    say: 'SWC is a table of points, each with an id, a type, x, y and z in µm, a radius and its parent',
    note: `This skeleton has ${count(CELL.counts.swcSamples)} of them: type 1 is the soma, type 3 basal dendrite.`,
    section: 'Inside the files',
    widget: 'skeleton:swc',
  },
  {
    say: 'MorphIO and NeuroM read the tree as sections, the unbranched runs between branch points',
    note: `This one has ${CELL.sections} sections, ${CELL.sectionsWithSpines} of them with spines. The spine table names a spine's section by its afferent_section_id, which counts the soma as section 0.`,
    widget: 'skeleton:sections',
  },
  {
    say: "The spiny H5 holds the skeleton, the soma's mesh, a table of the spines, and each spine's skeleton and mesh",
    note: "It is the format of morph-spines, OBI's library for morphologies with spines. Point at a part to see what it draws.",
    widget: 'skeleton:h5',
  },
  {
    say: 'Each row of the spine table is a spine',
    note: `${CELL.counts.spines} rows here: where the spine sits, which way it points, on which section, how long it is, and where its mesh and skeleton are kept.`,
    widget: 'skeleton:table',
  },
  {
    say: "Each spine's mesh is stored in a frame of its own, and the table's rotation and position put it on its dendrite",
    note: `The origin is near the root and +y runs towards the tip, at y = spine_length. Every mesh here also reaches below the origin, by ${CELL.belowOrigin[0]} to ${CELL.belowOrigin[1]} µm. Several rows can point to the same stored spine, so one mesh can be placed many times.`,
    widget: 'skeleton:frame',
  },
  {
    say: 'The format can also mark neck and head triangles and a spine type, but this file does not',
    note: "Both are optional, as are a spine's volume and neck diameter. Without them, morph-spines gives every spine the type undefined.",
    widget: 'skeleton:parts',
  },
  {
    say: 'Any column can colour the spines: here, their length',
    note: `From ${CELL.spineLengthRange[0]} to ${CELL.spineLengthRange[1]} µm on this cell.`,
    widget: 'skeleton:length',
  },
  {
    say: 'With entitysdk, find the skeletonized morphologies and fetch their spiny H5',
    note: "Search CellMorphology for has_segmented_spines, then fetch the file labelled morphology_with_spines. It needs a login, so the code is shown here, not run. Given a morphology's id, obi-one's CellMorphologyFromID fetches the file and loads it in one call.",
    section: 'In Python',
    widget: 'skeleton:fetch',
  },
  {
    say: 'morph-spines loads it in three parts: the skeleton, the soma and the spines',
    note: "The code from here on ran on morph-spines' example cell, the one in the view; a file fetched from the platform reads the same way. The skeleton is a NeuroM morphology.",
    widget: 'skeleton:load',
  },
  {
    say: 'The spine table is a pandas DataFrame, a row per spine',
    note: `Its section ids count the soma as 0, so the spines of section ${CELL.chosen.section} sit on morphology.sections[${CELL.chosen.section - CELL.sectionIdOffset}]. In the view, each section is labelled with the table's id.`,
    widget: 'skeleton:table-code',
  },
  {
    say: "Each spine's mesh comes placed on the cell, or upright in its own frame",
    note: "The table's rotation and translation take one to the other. In its own frame the mesh runs from below 0 up to y = spine_length: the origin is near the root, not at the mesh's lowest point. trimesh merges the vertices the file repeats, and as this file marks no necks, leaving the neck out leaves out nothing.",
    widget: 'skeleton:meshes',
  },
  {
    say: 'NeuroM measures the skeleton, and MorphIO reads it from inside the file',
    note: `${CELL.totalLength} µm of basal dendrite. The spiny H5 keeps the skeleton under /morphology/<name>, so MorphIO opens it with a Collection, not on its own.`,
    widget: 'skeleton:skeleton-code',
  },
  {
    say: 'MorphIO writes the skeleton as H5, ASC or SWC, and morph-tool converts it',
    note: `The H5's soma is a contour of ${CELL.soma.contourPoints} points, which SWC cannot hold: written straight, it has no width. morph-tool makes it a stack of cylinders, as NEURON does, or one sphere of the same surface.`,
    widget: 'skeleton:convert',
  },
  {
    say: 'morph-spines checks a file against its format',
    note: "This one is valid, with warnings: the skeleton and the spines' skeletons have no metadata, and their points are float64 rather than float32. A plain morphology H5 is not a spiny one.",
    widget: 'skeleton:validate',
  },
  {
    say: "obi-one's EM synapse mapping reads spiny morphologies to put synapses on their spines",
    note: "A synapse nearer a spine's mesh than its dendrite goes on that spine, and takes its row of the spine table.",
    widget: 'skeleton:downstream',
  },
  {
    say: 'A few things to remember',
    widget: 'skeleton:gotchas',
  },
  {
    say: 'Next, more of entitysdk, or choose another course',
    widget: 'skeleton:gotchas',
    cta: { course: 'entitysdk', label: 'How to use entitysdk' },
  },
];
