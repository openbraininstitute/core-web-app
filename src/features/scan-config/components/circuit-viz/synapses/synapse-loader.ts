import { Dataset, type Entity, Group, type File as H5File } from 'h5wasm';

import {
  createSurfaceSdf,
  drawnRadiusFactor,
  isSomaSection,
  projectOntoSurface,
  rescueOffSurface,
  type SomaEnvelope,
  type SurfacePoint,
  type SurfaceSdf,
  type SurfaceSegment,
  somaEnvelopeOf,
  transform,
} from '@/features/scan-config/components/drawn-surface';
import { isMorphoViewerDebugMode } from '@/morpho-viewer/debug-mode';
import { MorphoViewerTreeItemType } from '@/morpho-viewer/tree-item-type';
import { assertArrayNumber } from '@/util/type-guards';

import type { NodePlacement } from '@/features/circuit-nodes/geometry-utils';
import type { Vec3 } from '@/features/scan-config/components/drawn-surface';
import type { MorphoViewerTree } from '@/morpho-viewer';
import type { Report } from './report';

/** One edge population's afferent synapses, as flat `[x, y, z, …]` world coordinates. */
export type AfferentSynapseGroup = {
  coordinates: Float32Array;
  populationName: string;
};

/** Everything the pipeline needs that it cannot work out for itself. */
export type SynapseLoaderInput = {
  report: Report;
  /** Edge populations to read, grouped by the file they live in. */
  edges: Array<{ file: string; populations: string[] }>;
  /** Open one edge file for reading. The loader closes what it opens. */
  openEdgesFile: (file: string) => Promise<{ file: H5File; close: () => Promise<void> }>;
  /** The placement of a node by its index in the drawn population. */
  placementOf: (nodeIndex: number) => NodePlacement | null;
  /**
   * The morphology of a node by its index, in morphology-local coordinates —
   * the same tree the viewer paints.
   */
  loadTree: (nodeIndex: number) => Promise<MorphoViewerTree | null>;
};

/** The signed distance fields one cell needs, built once and shared. */
type CellSurfaces = {
  /** What the soma painter draws — where SONATA's soma synapses belong. */
  soma: SurfaceSdf | null;
  /** Everything the cell draws, for measuring and rescuing synapses against. */
  whole: SurfaceSdf | null;
  /** Where the spherical-soma model can reach — see {@link rescueOffSurface}. */
  somaEnvelope: SomaEnvelope | null;
};

/**
 * One morphology sample, kept in both spaces: local because that is where the
 * renderer decides how thick to draw a segment, world because that is where the
 * synapses are.
 */
type Sample = { local: Vec3; point: SurfacePoint };

/**
 * The segment between two samples as the viewer paints it, radii and all.
 *
 * Passing the same sample twice gives the degenerate segment a parentless root
 * is drawn as, which the renderer draws at its true radius.
 *
 * @see drawnRadiusFactor — why the radii are not the ones the morphology states.
 */
function drawnSegment(from: Sample, to: Sample): SurfaceSegment {
  const factor = drawnRadiusFactor(from.local, to.local);
  return {
    from: { ...from.point, radius: from.point.radius * factor },
    to: { ...to.point, radius: to.point.radius * factor },
  };
}

/**
 * How far outside the drawn surface a synapse has to sit before it is worth
 * moving. About the radius the viewer gives a marker: any closer and the marker
 * still touches its branch, so there is nothing to see.
 */
const OFF_SURFACE_TOLERANCE = 0.5;

/**
 * How many neurite synapses to measure against the drawn surface. Enough for a
 * stable median without walking a whole morphology thousands of times.
 */
const NEURITE_PROBE_LIMIT = 256;

/**
 * Above this many target cells the probe is skipped: it needs a signed distance
 * field over every segment of each cell, which is only cheap while "small
 * circuit" means what it says.
 */
const NEURITE_PROBE_CELL_LIMIT = 8;

/**
 * Retrieve afferent synapses from the circuit's edge files, one entry per edge
 * population, each holding a flat `[x, y, z, ...]` array of world coordinates.
 *
 * Positions come from `afferent_surface_*`, which is already on the neurite
 * surface. Soma synapses are the exception: they are computed against a
 * spherical soma while a morphology stores a stack of cones, so they get
 * projected onto the drawn soma ({@link projectOntoSurface}) or they float free
 * of it. "Drawn" there means the soma on screen, which is thinner than the one
 * the morphology describes — {@link drawnRadiusFactor} explains why, and why we
 * follow the picture rather than the data.
 *
 * Neurite synapses are left where SONATA put them, with one exception: a few
 * arrive near the soma yet clear of everything drawn, and those get pulled back
 * onto the mesh — see {@link rescueOffSurface}. A sample of the rest is measured
 * against the drawn surface — see {@link probeNeuriteSynapses}.
 *
 * @see https://sonata-extension.readthedocs.io/en/latest/sonata_tech.html#fields-for-edges
 */
export async function loadAfferentSynapses(
  input: SynapseLoaderInput
): Promise<AfferentSynapseGroup[]> {
  const { report, edges, openEdgesFile } = input;
  if (edges.length === 0) {
    report.logTask('No edges found in circuit config.');
    return [];
  }

  const results: AfferentSynapseGroup[] = [];
  for (const edge of edges) {
    report.logTask(`Loading edges file "${edge.file}"...`);
    const opened = await openEdgesFile(edge.file);
    try {
      for (const populationName of edge.populations) {
        try {
          const group = await readPopulation(input, opened.file, populationName);
          if (group) results.push(group);
        } catch (error) {
          // Contained here so one malformed population costs only its own
          // synapses. Reading them is a per-population job; letting the throw
          // out would drop every population in the circuit, including the ones
          // that read fine.
          report.logFailure(error);
        }
      }
    } finally {
      await opened.close();
    }
  }
  return results;
}

async function readPopulation(
  input: SynapseLoaderInput,
  edgesFile: H5File,
  populationName: string
): Promise<AfferentSynapseGroup | null> {
  const { report } = input;
  report.logTask(`Reading afferent synapse positions for population "${populationName}"...`);
  // Every dataset this function goes on to read, not just the first: a population
  // carrying `afferent_surface_x` and no `y` is one this cannot draw, and saying
  // which is missing beats `getNumberArray` throwing three lines later.
  // `target_node_id`, unlike the `afferent_*` ones, is not nested under `0/`.
  const required = [
    '0/afferent_surface_x',
    '0/afferent_surface_y',
    '0/afferent_surface_z',
    '0/afferent_section_id',
    'target_node_id',
  ];
  const missing = required.filter(
    (name) => !hasDataset(edgesFile, `edges/${populationName}/${name}`)
  );
  if (missing.length > 0) {
    report.logTask(
      `Population "${populationName}" has no afferent surfaces: ${missing.join(', ')}`
    );
    return null;
  }
  const ds = (name: string) => getNumberArray(report, edgesFile, `edges/${populationName}/${name}`);
  const arrXs = ds('0/afferent_surface_x');
  const arrYs = ds('0/afferent_surface_y');
  const arrZs = ds('0/afferent_surface_z');
  const arrSectionId = ds('0/afferent_section_id');
  const arrTarget = ds('target_node_id');

  const surfaces = await getCellSurfaces(input, arrSectionId, arrTarget);

  const coordinates = new Float32Array(arrXs.length * 3);
  let somaTotal = 0;
  let projected = 0;
  // How far the projected points still sit from the drawn soma. Should be
  // ~0; anything else means the reconstructed soma disagrees with the one
  // being drawn, which is the difference between "projection never ran"
  // and "projection ran against the wrong shape".
  let worstResidual = 0;
  let rescued = 0;
  for (let i = 0; i < arrXs.length; i++) {
    const surface: Vec3 = [arrXs[i], arrYs[i], arrZs[i]];
    const isSoma = isSomaSection(arrSectionId[i]);
    if (isSoma) somaTotal++;
    const cell = surfaces.get(arrTarget[i]);
    const sdf = isSoma ? cell?.soma : undefined;
    let point = surface;
    if (sdf) {
      point = projectOntoSurface(surface, sdf);
      projected++;
      worstResidual = Math.max(worstResidual, Math.abs(sdf(point).distance));
    } else if (cell?.whole && cell.somaEnvelope) {
      const rescue = rescueOffSurface(
        surface,
        cell.whole,
        cell.somaEnvelope,
        OFF_SURFACE_TOLERANCE
      );
      if (rescue) {
        point = rescue;
        rescued++;
      }
    }
    coordinates[i * 3] = point[0];
    coordinates[i * 3 + 1] = point[1];
    coordinates[i * 3 + 2] = point[2];
  }
  report.logTask(
    `Loaded ${arrXs.length} afferent synapses for "${populationName}": ` +
      `${somaTotal} on a soma, ${projected} projected` +
      (projected > 0 ? `, worst residual ${worstResidual.toFixed(3)}µm` : '') +
      (rescued > 0 ? `, ${rescued} rescued off the surface near a soma` : '') +
      '.'
  );
  // Diagnostic only, and up to `NEURITE_PROBE_LIMIT` SDF queries that each walk
  // every segment of their cell — so it runs for whoever is asking the question,
  // not for everyone.
  if (isMorphoViewerDebugMode()) {
    probeNeuriteSynapses(report, populationName, coordinates, arrSectionId, arrTarget, surfaces);
  }
  return { coordinates, populationName };
}

/**
 * Build the drawn surfaces of every *distinct* target cell in a population.
 *
 * Why up front: a cell's geometry is identical for all of its synapses, and a
 * small circuit holds a handful of cells against thousands of synapses.
 * Building per synapse would re-walk the morphology tree every time and make
 * the projection loop quadratic.
 */
async function getCellSurfaces(
  input: SynapseLoaderInput,
  sectionIds: number[],
  targetNodeIds: number[]
): Promise<Map<number, CellSurfaces>> {
  const surfaces = new Map<number, CellSurfaces>();
  const cellIndices = new Set(targetNodeIds);
  // Only cells that carry soma synapses need a soma SDF. The whole-morphology
  // one is built for every cell — it costs a couple of milliseconds and both
  // the rescue and the probe want it.
  const somaCells = new Set<number>();
  for (let i = 0; i < sectionIds.length; i++) {
    if (isSomaSection(sectionIds[i])) somaCells.add(targetNodeIds[i]);
  }

  for (const cellIndex of cellIndices) {
    const built = await buildCellSurfaces(input, cellIndex, { soma: somaCells.has(cellIndex) });
    if (built) surfaces.set(cellIndex, built);
  }
  return surfaces;
}

/**
 * Reconstruct the segments the viewer draws for one cell, in world
 * coordinates, and turn them into signed distance fields.
 *
 * Returns `null` when the cell can't be reconstructed, so callers fall back to
 * the raw SONATA coordinates rather than losing the synapse entirely.
 */
async function buildCellSurfaces(
  input: SynapseLoaderInput,
  cellIndex: number,
  want: { soma: boolean }
): Promise<CellSurfaces | null> {
  const { report, placementOf, loadTree } = input;
  // `target_node_id` indexes the target population, and the placement it is
  // handed indexes the drawn one. Those coincide for the single-cell circuits
  // this pipeline serves, but not in general — hence the lookup guard.
  const placement = placementOf(cellIndex);
  if (!placement) {
    report.logTask(`No placement for cell #${cellIndex}; leaving its synapses unprojected.`);
    return null;
  }

  const tree = await loadTree(cellIndex);
  const somaSegments: SurfaceSegment[] = [];
  const wholeSegments: SurfaceSegment[] = [];
  const stack = (tree?.roots ?? []).map((item) => ({
    item,
    parent: null as Sample | null,
  }));
  while (stack.length > 0) {
    const entry = stack.pop();
    if (!entry) continue;

    const { item, parent } = entry;
    const [x, y, z] = transform(item.x, item.y, item.z, placement);
    const sample: Sample = {
      local: [item.x, item.y, item.z],
      point: { x, y, z, radius: item.radius },
    };
    // Mirror the viewer's own segment construction: a parentless root is drawn
    // as a degenerate segment (a sphere), every other sample as a cone from
    // its parent — soma-typed ones by the soma painter, the rest by the
    // neurite painter. Reconstructing the soma any other way, by chaining
    // samples in traversal order say, invents surfaces the viewer never draws,
    // and synapses projected onto those hang off the mesh.
    const segment = parent ? drawnSegment(parent, sample) : drawnSegment(sample, sample);
    if (!parent || item.type === MorphoViewerTreeItemType.Soma) somaSegments.push(segment);
    wholeSegments.push(segment);

    for (const child of item.children ?? []) stack.push({ item: child, parent: sample });
  }
  report.logTask(
    `Cell #${cellIndex} draws ${wholeSegments.length} segment(s), ${somaSegments.length} of them soma.`
  );

  const soma = want.soma ? createSurfaceSdf(somaSegments) : null;
  if (want.soma && !soma) {
    report.logTask(`Cell #${cellIndex} draws no soma; leaving its soma synapses unprojected.`);
  }
  return {
    soma,
    whole: createSurfaceSdf(wholeSegments),
    somaEnvelope: somaEnvelopeOf(somaSegments, placement.center),
  };
}

/**
 * Measure how far a sample of neurite synapses sits from the drawn surface.
 *
 * Nothing acts on the result — it is the difference between "they look wrong"
 * and knowing whether they are. `afferent_surface_*` is supposed to be on the
 * neurite surface already, so a median near zero means any floating-looking
 * markers are a drawing artefact (a marker wider than its own branch, or a
 * branch out of frame) rather than misplaced coordinates.
 *
 * Near zero, not zero: neurites keep their SONATA coordinates, so they sit on
 * the branch the morphology describes rather than the slightly thinner one on
 * screen. At a median radius of 0.22µm that gap is measured in hundredths of a
 * micron — see {@link drawnRadiusFactor}.
 */
function probeNeuriteSynapses(
  report: Report,
  populationName: string,
  coordinates: Float32Array,
  sectionIds: number[],
  targetNodeIds: number[],
  surfaces: Map<number, CellSurfaces>
) {
  // Each query walks every segment of its cell, so this stays worth doing only
  // while "small circuit" means what it says.
  if (surfaces.size > NEURITE_PROBE_CELL_LIMIT) {
    report.logTask(
      `${surfaces.size} target cells — skipping the neurite surface probe (limit ${NEURITE_PROBE_CELL_LIMIT}).`
    );
    return;
  }

  // The surface comes along from the pass that selected the candidate: being
  // measurable against one is what makes it a candidate.
  const candidates: Array<{ index: number; sdf: SurfaceSdf }> = [];
  for (let i = 0; i < sectionIds.length; i++) {
    if (isSomaSection(sectionIds[i])) continue;

    const sdf = surfaces.get(targetNodeIds[i])?.whole;
    if (sdf) candidates.push({ index: i, sdf });
  }
  if (candidates.length === 0) return;

  // Evenly spread over the population rather than taking a prefix, so one
  // badly placed branch can't stand in for the whole cell.
  const stride = Math.max(1, Math.ceil(candidates.length / NEURITE_PROBE_LIMIT));
  const distances: number[] = [];
  for (let n = 0; n < candidates.length; n += stride) {
    const { index, sdf } = candidates[n];
    const point: Vec3 = [
      coordinates[index * 3],
      coordinates[index * 3 + 1],
      coordinates[index * 3 + 2],
    ];
    distances.push(Math.abs(sdf(point).distance));
  }

  distances.sort((a, b) => a - b);
  const at = (fraction: number) =>
    distances[Math.min(distances.length - 1, Math.floor(distances.length * fraction))];
  report.logTask(
    `Probed ${distances.length}/${candidates.length} neurite synapses of "${populationName}" ` +
      `against the drawn surface: median ${at(0.5).toFixed(3)}µm, ` +
      `p95 ${at(0.95).toFixed(3)}µm, max ${distances[distances.length - 1].toFixed(3)}µm.`
  );
}

function hasDataset(file: H5File, path: string) {
  return file.get(path) instanceof Dataset;
}

/** Read a numeric dataset whole, naming the file's actual contents if it isn't there. */
function getNumberArray(report: Report, file: H5File, path: string): number[] {
  const dataset = file.get(path);
  if (!(dataset instanceof Dataset)) {
    throw new Error(
      `Unable to find dataset at "${path}"!\nAvailable paths:\n${getAvailablePaths(file, path)}`
    );
  }

  report.logTask(`Parsing Dataset "${path}"...`);
  const data = dataset.json_value;
  assertArrayNumber(data);
  return data;
}

function getAvailablePaths(file: H5File, path: string) {
  let entity: Entity | null = file;
  const validPath: string[] = [];
  const parts = path.split('/');
  for (const part of parts) {
    if (!(entity instanceof Group)) break;

    validPath.push(part);
    entity = entity.get(part);
    if (!entity) validPath.pop();
  }
  const prefix = validPath.join('/');
  const group = file.get(prefix);
  if (!(group instanceof Group)) return prefix;

  return group
    .keys()
    .map((name) => `  - ${prefix}/${name}`)
    .join('\n');
}
