import { Dataset, type Entity, Group, File as H5File, ready } from 'h5wasm';

import { downloadAsset, getAssets, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import {
  type MorphoViewerSmallCircuitCell,
  type MorphoViewerSmallCircuitCellData,
  MorphoViewerTreeItemType,
} from '@/morpho-viewer';
import GenericEvent from '@/util/generic-event';
import { assertType } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import { CircuitConfig } from './circuit-config';
import {
  createSurfaceSdf,
  isSomaSection,
  projectOntoSurface,
  type SurfacePoint,
  type SurfaceSdf,
  type SurfaceSegment,
} from './morphology-surface';
import { Report } from './report';
import { convertSwcToTree } from './swc';
import { transform } from './transform';

import type { DirectoryItem } from '@/api/entitycore/types/shared/global';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';
import type { Vec3 } from './sdf';

/** The signed distance fields one cell needs, built once and shared. */
type CellSurfaces = {
  /** What the soma painter draws — where SONATA's soma synapses belong. */
  soma: SurfaceSdf | null;
  /** Everything the cell draws, for measuring neurite synapses against. */
  whole: SurfaceSdf | null;
};

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

export class CircuitLoader {
  public readonly report = new Report();

  private readonly eventLoaded = new GenericEvent<boolean>();

  private _loaded = false;

  private _circuit: MorphoViewerSmallCircuitCell[] = [];

  private directory: Record<string, DirectoryItem> = {};

  private assetDirectoryId = '';

  private circuitConfig = new CircuitConfig({
    networks: { nodes: [], edges: [] },
  });

  private morphologiesDir = '';

  private _synapses: { coordinates: Float32Array; populationName: string }[] = [];

  private readonly cacheCells = new Map<string, Promise<MorphoViewerSmallCircuitCellData | null>>();

  constructor(
    private readonly model: TSupportedEntitiesForScanConfiguration,
    private readonly virtualLabId: string,
    private readonly projectId: string
  ) {
    this.initialize();
  }

  useLoaded() {
    return this.eventLoaded.useValue(this.loaded);
  }

  useError() {
    return this.report.useError();
  }

  get circuit() {
    return this._circuit;
  }

  get synapses() {
    return this._synapses;
  }

  get loaded(): boolean {
    return this._loaded;
  }
  private set loaded(loaded: boolean) {
    if (this._loaded === loaded) return;

    this._loaded = loaded;
    this.eventLoaded.dispatch(loaded);
  }

  readonly loadCell = async (id: string): Promise<MorphoViewerSmallCircuitCellData | null> => {
    const fromCache = this.cacheCells.get(id);
    if (fromCache) return fromCache;

    const cell = this.loadCellNow(id);
    this.cacheCells.set(id, cell);
    return cell;
  };

  private async loadCellNow(id: string) {
    try {
      const morphologyFilename = `${this.morphologiesDir}/${id}.swc`;
      const morphology = await this.loadText(morphologyFilename);
      const tree = convertSwcToTree(morphology);
      const cell: MorphoViewerSmallCircuitCellData = { type: 'tree', data: tree };
      return cell;
    } catch (error) {
      const { report } = this;
      report.logFailure(error);
      return null;
    }
  }

  private async initialize() {
    const { model, virtualLabId, projectId, report } = this;
    report.clear();
    try {
      this.loaded = false;
      const assets = await this.loadAssets();
      report.logTask('Looking for asset directory with label "sonata_circuit"...');
      const assetDirectory = assets.data.find((asset) => asset.label === 'sonata_circuit');
      if (!assetDirectory) throw new Error('No asset directory found!');

      this.assetDirectoryId = assetDirectory.id;
      report.logTask('Listing directory...');
      const directory = await listDirectoryOfAssets({
        ctx: { virtualLabId, projectId },
        entityType: model.type,
        entityId: model.id,
        id: assetDirectory.id,
      });
      this.directory = directory.files;
      const circuitConfig = await this.loadJSON('circuit_config.json');
      this.circuitConfig = new CircuitConfig(circuitConfig);
      this.morphologiesDir = this.circuitConfig.config.components.morphologies_dir;
      report.logTask(`Default morphologies dir: "${this.morphologiesDir}"`);
      const nodeSet = await this.loadNodeSet();
      const circuit = await this.getMorphoViewerSmallCircuitCells(nodeSet);
      this._circuit = circuit;
      const synapses = await this.getAfferentSynapses();
      this._synapses = synapses;
      this.loaded = true;
    } catch (error) {
      report.logFailure(error);
      this.loaded = false;
    } finally {
      this.report.debug();
    }
  }

  private lookForPopulationMorphologiesDir(populationName: string) {
    const { config } = this.circuitConfig;
    for (const node of config.networks.nodes) {
      const population = node.populations[populationName];
      if (population?.morphologies_dir) {
        this.morphologiesDir = population.morphologies_dir;
        this.report.logTask(
          `Population "${populationName}" overrides morphologies dir: "${this.morphologiesDir}"`
        );
        return;
      }
    }
  }

  /**
   * Retrieve afferent synapses from the SONATA file, one entry per edge
   * population, each holding a flat `[x, y, z, ...]` array of world coordinates.
   *
   * Positions come from `afferent_surface_*`, which is already on the neurite
   * surface. Soma synapses are the exception: they are computed against a
   * spherical soma while SWC stores a stack of cones, so they get projected
   * onto the drawn soma ({@link projectOntoSurface}) or they float free of it.
   *
   * Neurite synapses are left where SONATA put them, but a sample of them is
   * measured against the drawn surface — see {@link probeNeuriteSynapses}.
   *
   * @see https://sonata-extension.readthedocs.io/en/latest/sonata_tech.html#fields-for-edges
   */
  private async getAfferentSynapses(): Promise<
    Array<{ coordinates: Float32Array; populationName: string }>
  > {
    const { report, circuitConfig } = this;
    const { config } = circuitConfig;
    if (config.networks.edges.length === 0) {
      report.logTask('No edges found in circuit config.');
      return [];
    }
    const results: Array<{ coordinates: Float32Array; populationName: string }> = [];
    for (const edge of config.networks.edges) {
      report.logTask(`Loading edges file "${edge.edges_file}"...`);
      const edgesFile = await this.loadH5(edge.edges_file);
      for (const populationName of Object.keys(edge.populations)) {
        report.logTask(`Reading afferent synapse positions for population "${populationName}"...`);
        if (!this.hasDataset(edgesFile, `edges/${populationName}/0/afferent_surface_x`)) {
          report.logTask(`No afferent_surface dataset found!`);
          continue;
        }
        const ds = (name: string) =>
          this.getDataset(edgesFile, `edges/${populationName}/${name}`, assertArrayNumber);
        const arrXs = ds('0/afferent_surface_x');
        const arrYs = ds('0/afferent_surface_y');
        const arrZs = ds('0/afferent_surface_z');
        const arrSectionId = ds('0/afferent_section_id');
        // Unlike the `afferent_*` datasets, this one is not nested under `0/`.
        const arrTarget = ds('target_node_id');

        const surfaces = await this.getCellSurfaces(arrSectionId, arrTarget);

        const coordinates = new Float32Array(arrXs.length * 3);
        let somaTotal = 0;
        let projected = 0;
        // How far the projected points still sit from the drawn soma. Should be
        // ~0; anything else means the reconstructed soma disagrees with the one
        // being drawn, which is the difference between "projection never ran"
        // and "projection ran against the wrong shape".
        let worstResidual = 0;
        for (let i = 0; i < arrXs.length; i++) {
          const surface: Vec3 = [arrXs[i], arrYs[i], arrZs[i]];
          const isSoma = isSomaSection(arrSectionId[i]);
          if (isSoma) somaTotal++;
          const sdf = isSoma ? surfaces.get(arrTarget[i])?.soma : undefined;
          let point = surface;
          if (sdf) {
            point = projectOntoSurface(surface, sdf);
            projected++;
            worstResidual = Math.max(worstResidual, Math.abs(sdf(point).distance));
          }
          coordinates[i * 3] = point[0];
          coordinates[i * 3 + 1] = point[1];
          coordinates[i * 3 + 2] = point[2];
        }
        report.logTask(
          `Loaded ${arrXs.length} afferent synapses for "${populationName}": ` +
            `${somaTotal} on a soma, ${projected} projected` +
            (projected > 0 ? `, worst residual ${worstResidual.toFixed(3)}µm` : '') +
            '.'
        );
        this.probeNeuriteSynapses(populationName, coordinates, arrSectionId, arrTarget, surfaces);
        results.push({ coordinates, populationName });
      }
    }
    return results;
  }

  /**
   * Build the drawn surfaces of every *distinct* target cell in a population.
   *
   * Why up front: a cell's geometry is identical for all of its synapses, and a
   * small circuit holds a handful of cells against thousands of synapses.
   * Building per synapse would re-walk the morphology tree every time and make
   * the projection loop quadratic.
   */
  private async getCellSurfaces(
    sectionIds: number[],
    targetNodeIds: number[]
  ): Promise<Map<number, CellSurfaces>> {
    const surfaces = new Map<number, CellSurfaces>();
    const cellIndices = new Set(targetNodeIds);
    // Only cells that carry soma synapses need a soma SDF; every cell needs the
    // whole-morphology one only if we are going to probe its neurites.
    const somaCells = new Set<number>();
    for (let i = 0; i < sectionIds.length; i++) {
      if (isSomaSection(sectionIds[i])) somaCells.add(targetNodeIds[i]);
    }
    const probeNeurites = cellIndices.size <= NEURITE_PROBE_CELL_LIMIT;
    if (!probeNeurites) {
      this.report.logTask(
        `${cellIndices.size} target cells — skipping the neurite surface probe (limit ${NEURITE_PROBE_CELL_LIMIT}).`
      );
    }

    for (const cellIndex of cellIndices) {
      const built = await this.buildCellSurfaces(cellIndex, {
        soma: somaCells.has(cellIndex),
        whole: probeNeurites,
      });
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
  private async buildCellSurfaces(
    cellIndex: number,
    want: { soma: boolean; whole: boolean }
  ): Promise<CellSurfaces | null> {
    const { report } = this;
    // `target_node_id` indexes the target population; `circuit` holds the
    // selected node set. Those coincide for the single-cell circuits this
    // loader serves, but not in general — hence the lookup guard.
    const cellDef = this.circuit[cellIndex];
    if (!cellDef) {
      report.logTask(`No morphology for cell #${cellIndex}; leaving its synapses unprojected.`);
      return null;
    }
    if (!want.soma && !want.whole) return null;

    const cell = await this.loadCell(cellDef.id);
    const somaSegments: SurfaceSegment[] = [];
    const wholeSegments: SurfaceSegment[] = [];
    const stack = (cell?.data.roots ?? []).map((item) => ({
      item,
      parent: null as SurfacePoint | null,
    }));
    while (stack.length > 0) {
      const entry = stack.pop();
      if (!entry) continue;

      const { item, parent } = entry;
      const [x, y, z] = transform(item.x, item.y, item.z, cellDef);
      const point: SurfacePoint = { x, y, z, radius: item.radius };
      // Mirror the viewer's own segment construction: a parentless root is drawn
      // as a degenerate segment (a sphere), every other sample as a cone from
      // its parent — soma-typed ones by the soma painter, the rest by the
      // neurite painter. Reconstructing the soma any other way, by chaining
      // samples in traversal order say, invents surfaces the viewer never draws,
      // and synapses projected onto those hang off the mesh.
      const segment: SurfaceSegment = { from: parent ?? point, to: point };
      if (!parent || item.type === MorphoViewerTreeItemType.Soma) somaSegments.push(segment);
      wholeSegments.push(segment);

      for (const child of item.children ?? []) stack.push({ item: child, parent: point });
    }
    report.logTask(
      `Cell #${cellIndex} draws ${wholeSegments.length} segment(s), ${somaSegments.length} of them soma.`
    );

    const soma = want.soma ? createSurfaceSdf(somaSegments) : null;
    if (want.soma && !soma) {
      report.logTask(`Cell #${cellIndex} draws no soma; leaving its soma synapses unprojected.`);
    }
    return { soma, whole: want.whole ? createSurfaceSdf(wholeSegments) : null };
  }

  /**
   * Measure how far a sample of neurite synapses sits from the drawn surface.
   *
   * Nothing acts on the result — it is the difference between "they look wrong"
   * and knowing whether they are. `afferent_surface_*` is supposed to be on the
   * neurite surface already, so a median near zero means any floating-looking
   * markers are a drawing artefact (a marker wider than its own branch, or a
   * branch out of frame) rather than misplaced coordinates.
   */
  private probeNeuriteSynapses(
    populationName: string,
    coordinates: Float32Array,
    sectionIds: number[],
    targetNodeIds: number[],
    surfaces: Map<number, CellSurfaces>
  ) {
    const candidates: number[] = [];
    for (let i = 0; i < sectionIds.length; i++) {
      if (!isSomaSection(sectionIds[i]) && surfaces.get(targetNodeIds[i])?.whole)
        candidates.push(i);
    }
    if (candidates.length === 0) return;

    // Evenly spread over the population rather than taking a prefix, so one
    // badly placed branch can't stand in for the whole cell.
    const stride = Math.max(1, Math.floor(candidates.length / NEURITE_PROBE_LIMIT));
    const distances: number[] = [];
    for (let n = 0; n < candidates.length; n += stride) {
      const i = candidates[n];
      const sdf = surfaces.get(targetNodeIds[i])?.whole;
      if (!sdf) continue;

      const point: Vec3 = [coordinates[i * 3], coordinates[i * 3 + 1], coordinates[i * 3 + 2]];
      distances.push(Math.abs(sdf(point).distance));
    }
    if (distances.length === 0) return;

    distances.sort((a, b) => a - b);
    const at = (fraction: number) =>
      distances[Math.min(distances.length - 1, Math.floor(distances.length * fraction))];
    this.report.logTask(
      `Probed ${distances.length}/${candidates.length} neurite synapses of "${populationName}" ` +
        `against the drawn surface: median ${at(0.5).toFixed(3)}µm, ` +
        `p95 ${at(0.95).toFixed(3)}µm, max ${distances[distances.length - 1].toFixed(3)}µm.`
    );
  }

  private async getMorphoViewerSmallCircuitCells(
    nodeSet: SonataNodeSet
  ): Promise<MorphoViewerSmallCircuitCell[]> {
    const { report } = this;
    const { config } = this.circuitConfig;
    report.logTask(`Looking in "config.networks.nodes" for population "${nodeSet.population}"...`);
    const node = config.networks.nodes.find((n) => !!n.populations[nodeSet.population]);
    if (!node) {
      throw new Error(`Unable to find node for population "${nodeSet.population}"!`);
    }
    this.lookForPopulationMorphologiesDir(nodeSet.population);
    const nodesFile = await this.loadH5(node.nodes_file);
    const ids = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/morphology`,
      assertArrayString
    );
    const positionX = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/x`,
      assertArrayNumber
    );
    const positionY = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/y`,
      assertArrayNumber
    );
    const positionZ = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/z`,
      assertArrayNumber
    );
    const orientationX = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/orientation_x`,
      assertArrayNumber
    );
    const orientationY = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/orientation_y`,
      assertArrayNumber
    );
    const orientationZ = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/orientation_z`,
      assertArrayNumber
    );
    const orientationW = this.getDataset(
      nodesFile,
      `nodes/${nodeSet.population}/0/orientation_w`,
      assertArrayNumber
    );
    return ids.map((id, index) => {
      const cell: MorphoViewerSmallCircuitCell = {
        id,
        center: [positionX[index], positionY[index], positionZ[index]],
        orientation: [
          orientationX[index],
          orientationY[index],
          orientationZ[index],
          orientationW[index],
        ],
        somaRadius: 50,
        color: {
          soma: '#aaa',
          axon: '#39F',
          apicalDendrite: '#b2f',
          basalDendrite: '#f55',
          myelin: '#ff0',
          unknown: '#f80',
        },
      };
      return cell;
    });
  }

  private hasDataset(file: H5File, path: string) {
    const dataset = file.get(path);
    return dataset instanceof Dataset;
  }

  private getDataset<T>(
    file: H5File,
    path: string,
    typeChecker: (data: unknown) => asserts data is T
  ): T {
    const dataset = file.get(path);
    if (!(dataset instanceof Dataset)) {
      throw new Error(
        `Unable to find dataset at "${path}"!\nAvailable paths:\n${getAvailablePaths(file, path)}`
      );
    }

    this.report.logTask(`Parsing Dataset "${path}"...`);
    const data = dataset.json_value;
    typeChecker(data);
    return data;
  }

  private async loadNodeSet() {
    const { report, circuitConfig } = this;
    report.logTask('Looking for nodeset file in circuit config...');
    report.logTask(`"node_sets_files": "${circuitConfig.config.node_sets_file}"`);
    const nodeSetsFile = await this.loadJSON(circuitConfig.config.node_sets_file);
    assertNodeSets(nodeSetsFile);
    const nodeSet = nodeSetsFile['All'];
    if (!nodeSet) {
      report.logTask(`Available node sets: ${Object.keys(nodeSetsFile).join(', ')}.`);
      throw new Error('Missing node set "All"!');
    }
    nodeSet.node_id ??= [];
    const count = nodeSet.node_id.length;
    report.logTask(`Number of nodes found: ${count}`);
    if (count > 0) return nodeSet;

    const names = Object.keys(nodeSetsFile)
      .filter((key) => (nodeSetsFile[key]?.node_id?.length ?? 0) > 0)
      .sort((key1, key2) => {
        const obj1 = nodeSetsFile[key1];
        const obj2 = nodeSetsFile[key2];
        const cnt1 = obj1.node_id?.length ?? 0;
        const cnt2 = obj2.node_id?.length ?? 0;
        if (cnt1 < cnt2) return +1;
        if (cnt1 > cnt2) return -1;
        if (key1 < key2) return -1;
        if (key1 > key2) return +1;
        return 0;
      });
    if (names.length === 0) {
      throw new Error(`None of the node sets have any cell id!`);
    }
    const name = lookforObviousNodeSet(names, nodeSetsFile);
    if (!name) {
      throw new Error(
        `Could not find any cell id for "All". Available ones are:\n${names
          .map(
            (name) =>
              `• ${name}:\n    • count: ${nodeSetsFile[name].node_id?.length}\n    • population: ${nodeSetsFile[name].population}`
          )
          .join('\n')}`
      );
    }

    report.logTask('All node sets look the same, so we take the first one.');
    return nodeSetsFile[name];
  }

  private async loadText(assetPath: string): Promise<string> {
    const data = await this.loadFile(assetPath);
    this.report.logTask(`Decoding text file "${assetPath}"...`);
    const text = new TextDecoder().decode(data);
    return text;
  }

  private async loadJSON(assetPath: string): Promise<unknown> {
    const text = await this.loadText(assetPath);
    this.report.logTask(`Parsing JSON file "${assetPath}"...`);
    return JSON.parse(text);
  }

  private async loadH5(assetPath: string): Promise<H5File> {
    const data = await this.loadFile(assetPath);
    this.report.logTask(`Parsing HDF5 file "${assetPath}"...`);
    const magic = new Uint8Array(data, 0, 8);
    // Expected: 89 48 44 46 0d 0a 1a 0a
    if (magic[0] !== 0x89 || magic[1] !== 0x48 || magic[2] !== 0x44 || magic[3] !== 0x46) {
      logError('Not a valid HDF5 file!');
      throw new Error('Invalid HDF5 file format!');
    }

    const { FS } = await ready;
    const filename = `sonata_${Date.now()}.h5`;
    FS.writeFile(filename, new Uint8Array(data));
    const file = new H5File(filename, 'r');
    return file;
  }

  private async loadFile(assetPath: string): Promise<ArrayBuffer> {
    const { model, virtualLabId, projectId, assetDirectoryId } = this;
    this.report.logTask(`Loading file "${assetPath}"...`);
    const content = await downloadAsset({
      ctx: { virtualLabId, projectId },
      entityType: model.type,
      entityId: model.id,
      id: assetDirectoryId,
      assetPath,
      asRawResponse: true,
    });
    return content.arrayBuffer();
  }

  private async loadAssets() {
    const { model, virtualLabId, projectId, report } = this;
    report.logTask(`Loading assets "${model.id}" of type "${model.type}"...`);
    const assets = await getAssets({
      ctx: { virtualLabId, projectId },
      entityType: model.type,
      entityId: model.id,
    });
    return assets;
  }
}

type SonataNodeSet = {
  population: string;
  node_id?: number[];
};

type SonataNodeSets = Record<string, SonataNodeSet>;

function assertNodeSets(data: unknown, prefix = 'node_sets.json'): asserts data is SonataNodeSets {
  assertType<SonataNodeSets>(data, ['map', { node_id: ['?', ['array', 'number']] }], prefix);
}

/**
 * Use this function to inpect the internal structure of Groups and Datasets
 * of a HDF5 file.
 */
function _debugH5(file: H5File) {
  const logs: string[] = [];
  const recurse = (node: Entity, indent: number) => {
    if (!('keys' in node)) return;

    const group = node as H5File;
    for (const key of group.keys()) {
      const child = group.get(key);
      const prefix = '  '.repeat(indent);
      if (child instanceof Dataset) {
        logs.push(`${prefix}[D] ${key} (shape: ${child.shape}, dtype: ${child.dtype})`);
      } else if (child && 'keys' in child) {
        logs.push(`${prefix}[G] ${key}/`);
        recurse(child, indent + 1);
      } else {
        logs.push(`${prefix}[?] ${key}`);
      }
    }
  };
  recurse(file, 0);
  // biome-ignore lint/suspicious/noConsole: this method is only used for debugging.
  console.debug(logs.join('\n'));
}

function assertArrayString(data: unknown): asserts data is string[] {
  assertType(data, ['array', 'string']);
}

function assertArrayNumber(data: unknown): asserts data is number[] {
  assertType(data, ['array', 'number']);
}

/**
 * Many circuits have just one population and one cell.
 * In this case, we can use any node set.
 */
function lookforObviousNodeSet(names: string[], nodeSetsFile: SonataNodeSets): string | null {
  if (names.length === 0) return null;

  const signatures = new Set<string>();
  for (const name of names) {
    const nodeSet = nodeSetsFile[name];
    if (!nodeSet) continue;

    const signature = `${JSON.stringify((nodeSet.node_id ?? []).sort())}\t${nodeSet.population}`;
    signatures.add(signature);
  }
  if (signatures.size > 1) return null;

  return names[0];
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
