import { Dataset, type Entity, Group, File as H5File, ready } from 'h5wasm';

import { downloadAsset, getAssets } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
import { NodesSchema } from '@/features/scan-config/types';
import GenericEvent from '@/util/generic-event';
import { assertArray, assertType } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import { CircuitConfig } from './circuit-config';
import { Report } from './report';
import { convertSwcToTree } from './swc';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';
import type { Node, Nodes, TSynapseGroups } from '@/features/scan-config/types';
import type {
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
} from '@/morpho-viewer';

/** All the loader reads off an entity; full scan-config entities satisfy it structurally. */
type TCircuitEntityRef = { id: string; type: TEntityTypeDict };

export class CircuitLoader {
  public readonly report = new Report();

  private readonly eventLoaded = new GenericEvent<boolean>();

  private _loaded = false;

  private _circuit: MorphoViewerSmallCircuitCell[] = [];

  private circuitConfig = new CircuitConfig({
    networks: { nodes: [], edges: [] },
  });

  private morphologiesDir = '';

  private readonly cacheCells = new Map<string, Promise<MorphoViewerSmallCircuitCellData | null>>();

  private _asyncAssetDirectoryId: Promise<string> | null = null;

  private _asyncConfig: Promise<CircuitConfig> | null = null;

  private _asyncNodes: Promise<Nodes> | null = null;

  private _asyncSynapses: Promise<TSynapseGroups> | null = null;

  private readonly files = new Map<string, Promise<ArrayBuffer>>();

  private readonly h5Files = new Map<string, Promise<{ file: H5File; filename: string }>>();

  private disposed = false;

  constructor(
    private readonly model: TCircuitEntityRef,
    private readonly virtualLabId: string,
    private readonly projectId: string
  ) {}

  /** The circuit's SONATA config, downloaded and manifest-resolved once. */
  get asyncCircuitConfig(): Promise<CircuitConfig> {
    this._asyncConfig ??= this.retryable(
      this.loadJSON('circuit_config.json').then((json) => new CircuitConfig(json)),
      () => {
        this._asyncConfig = null;
      }
    );
    return this._asyncConfig;
  }

  /**
   * Memoize a result but not a failure.
   *
   * `loadFile`/`loadH5` already evict failed downloads so the next call retries; without the
   * same rule here, the memo above would keep re-serving that one rejection for the loader's
   * lifetime and defeat every automatic recovery path.
   */
  private retryable<T>(promise: Promise<T>, forget: () => void): Promise<T> {
    promise.catch(forget);
    return promise;
  }

  /**
   * The circuit's cells, in the shape OBI-One's `/circuit/viz/{id}/nodes` used to serve:
   * every biophysical population in name order, each node with its position, orientation
   * quaternion and the morphology file+name the `/morphologies` endpoint expects.
   */
  getNodes(): Promise<Nodes> {
    this._asyncNodes ??= this.retryable(
      this.readNodes().then((nodes) => NodesSchema.parse(nodes)),
      () => {
        this._asyncNodes = null;
      }
    );
    return this._asyncNodes;
  }

  /** Release the WASM-side copies of every parsed H5 file. The loader is unusable after. */
  async dispose() {
    this.disposed = true;
    const { FS } = await ready;
    for (const pending of this.h5Files.values()) {
      try {
        const { file, filename } = await pending;
        file.close();
        FS.unlink(filename);
      } catch {
        // A file that failed to parse holds nothing to release.
      }
    }
    this.h5Files.clear();
    this.files.clear();
  }

  /** Raw afferent synapses per edge population, mirroring `/circuit/viz/{id}/synapses`. */
  getAfferentSynapses(): Promise<TSynapseGroups> {
    this._asyncSynapses ??= this.retryable(this.readAfferentSynapses(), () => {
      this._asyncSynapses = null;
    });
    return this._asyncSynapses;
  }

  private async readNodes(): Promise<Nodes> {
    const { config } = await this.asyncCircuitConfig;
    const nodes: Node[] = [];

    for (const { nodesFile, populationName, population } of listBiophysicalPopulations(config)) {
      const rule = resolveMorphologyRule(config, populationName, population);
      const file = await this.loadH5(nodesFile);
      this.assertUsable();
      const { x, y, z, qx, qy, qz, qw } = this.readNodeGeometry(file, populationName);
      const names = this.readMorphologyNames(file, populationName);

      for (let i = 0; i < x.length; i++) {
        nodes.push({
          position: [x[i], y[i], z[i]],
          orientation: [qx[i], qy[i], qz[i], qw[i]],
          morphology_file: morphologyFileOf(rule, names[i]),
          morphology_name: names[i],
        });
      }
    }

    return nodes;
  }

  /** The seven per-node geometry datasets both the viz and the legacy preview read. */
  private readNodeGeometry(file: H5File, populationName: string) {
    const group = (name: string) => `nodes/${populationName}/0/${name}`;
    return {
      x: this.getNumberArray(file, group('x')),
      y: this.getNumberArray(file, group('y')),
      z: this.getNumberArray(file, group('z')),
      qx: this.getNumberArray(file, group('orientation_x')),
      qy: this.getNumberArray(file, group('orientation_y')),
      qz: this.getNumberArray(file, group('orientation_z')),
      qw: this.getNumberArray(file, group('orientation_w')),
    };
  }

  /** Morphology names per node, decoding SONATA's `@library` enum encoding when present. */
  private readMorphologyNames(file: H5File, populationName: string): string[] {
    const values = this.getDataset(file, `nodes/${populationName}/0/morphology`, assertArray);
    const libraryPath = `nodes/${populationName}/0/@library/morphology`;
    if (
      values.every((value): value is number => typeof value === 'number') &&
      this.hasDataset(file, libraryPath)
    ) {
      const library = this.getDataset(file, libraryPath, assertArray);
      return values.map((value) => String(library[value]));
    }
    return values.map((value) => String(value));
  }

  private async readAfferentSynapses(): Promise<TSynapseGroups> {
    const { config } = await this.asyncCircuitConfig;
    const groups: TSynapseGroups = [];

    for (const edge of config.networks.edges) {
      const file = await this.loadH5(edge.edges_file);
      // Without this a disposal mid-download closes the file, every `hasDataset` reads
      // false, and the circuit caches an empty synapse list as a success.
      this.assertUsable();
      for (const populationName of Object.keys(edge.populations)) {
        const attribute = (name: string) => `edges/${populationName}/0/${name}`;
        // A population without surface positions is a purely functional connectome:
        // nothing to draw, skipped rather than an error.
        if (!AFFERENT_ATTRIBUTES.every((name) => this.hasDataset(file, attribute(name)))) {
          continue;
        }

        const x = this.getNumberArray(file, attribute('afferent_surface_x'));
        const y = this.getNumberArray(file, attribute('afferent_surface_y'));
        const z = this.getNumberArray(file, attribute('afferent_surface_z'));
        const sectionIds = this.getNumberArray(file, attribute('afferent_section_id'));
        // Unlike the `afferent_*` attributes, targets sit at the population root.
        const targetIds = this.getNumberArray(file, `edges/${populationName}/target_node_id`);

        const coordinates: number[] = new Array(x.length * 3);
        for (let i = 0; i < x.length; i++) {
          coordinates[i * 3] = x[i];
          coordinates[i * 3 + 1] = y[i];
          coordinates[i * 3 + 2] = z[i];
        }

        groups.push({
          population_name: populationName,
          coordinates,
          section_ids: sectionIds,
          target_node_ids: targetIds,
        });
      }
    }

    return groups;
  }

  private assertUsable() {
    if (this.disposed) throw new Error('This circuit loader was disposed.');
  }

  private hasDataset(file: H5File, path: string): boolean {
    return file.get(path) instanceof Dataset;
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
      if (!this.morphologiesDir) {
        throw new Error('Legacy preview not initialized — call initializeLegacyPreview() first.');
      }
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

  /** Load the legacy SWC preview (node set selection, cells, SWC morphologies). */
  async initializeLegacyPreview() {
    const { report } = this;
    report.clear();
    try {
      this.loaded = false;
      this.circuitConfig = await this.asyncCircuitConfig;
      this.morphologiesDir = this.circuitConfig.config.components.morphologies_dir;
      report.logTask(`Default morphologies dir: "${this.morphologiesDir}"`);
      const nodeSet = await this.loadNodeSet();
      const circuit = await this.getMorphoViewerSmallCircuitCells(nodeSet);
      this._circuit = circuit;
      this.loaded = true;
    } catch (error) {
      report.logFailure(error);
      this.loaded = false;
    } finally {
      this.report.debug();
    }
  }

  private get asyncAssetDirectoryId(): Promise<string> {
    this._asyncAssetDirectoryId ??= this.retryable(
      this.loadAssets().then((assets) => {
        this.report.logTask('Looking for asset directory with label "sonata_circuit"...');
        const assetDirectory = assets.data.find((asset) => asset.label === 'sonata_circuit');
        if (!assetDirectory) throw new Error('No asset directory found!');
        return assetDirectory.id;
      }),
      () => {
        this._asyncAssetDirectoryId = null;
      }
    );
    return this._asyncAssetDirectoryId;
  }

  private lookForPopulationMorphologiesDir(populationName: string) {
    const dir = findPopulation(this.circuitConfig.config, populationName)?.morphologies_dir;
    if (!dir) return;
    this.morphologiesDir = dir;
    this.report.logTask(
      `Population "${populationName}" overrides morphologies dir: "${this.morphologiesDir}"`
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
    const ids = this.readMorphologyNames(nodesFile, nodeSet.population);
    const { x, y, z, qx, qy, qz, qw } = this.readNodeGeometry(nodesFile, nodeSet.population);
    return ids.map((id, index) => {
      const cell: MorphoViewerSmallCircuitCell = {
        id,
        center: [x[index], y[index], z[index]],
        orientation: [qx[index], qy[index], qz[index], qw[index]],
        somaRadius: 50,
        color: SECTION_TYPE_COLORS,
      };
      return cell;
    });
  }

  private getNumberArray(file: H5File, path: string): number[] {
    const dataset = file.get(path);
    if (!(dataset instanceof Dataset)) {
      throw new Error(
        `Unable to find dataset at "${path}"!\nAvailable paths:\n${getAvailablePaths(file, path)}`
      );
    }
    const value = dataset.value;
    if (ArrayBuffer.isView(value)) {
      return Array.from(value, Number);
    }
    assertArray(value);
    return value.map(Number);
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

  private loadH5(assetPath: string): Promise<H5File> {
    const cached = this.h5Files.get(assetPath);
    if (cached) return cached.then((entry) => entry.file);

    const promise = (async () => {
      const data = await this.loadFile(assetPath);
      this.report.logTask(`Parsing HDF5 file "${assetPath}"...`);
      const magic = new Uint8Array(data, 0, 8);
      // Expected: 89 48 44 46 0d 0a 1a 0a
      if (magic[0] !== 0x89 || magic[1] !== 0x48 || magic[2] !== 0x44 || magic[3] !== 0x46) {
        logError('Not a valid HDF5 file!');
        throw new Error('Invalid HDF5 file format!');
      }

      const { FS } = await ready;
      const filename = `sonata_${nextH5FileId()}.h5`;
      FS.writeFile(filename, new Uint8Array(data));
      // MEMFS now holds the bytes; keeping the ArrayBuffer too would double the memory.
      this.files.delete(assetPath);
      return { file: new H5File(filename, 'r'), filename };
    })();
    this.h5Files.set(assetPath, promise);
    promise.catch(() => this.h5Files.delete(assetPath));
    return promise.then((entry) => entry.file);
  }

  private loadFile(assetPath: string): Promise<ArrayBuffer> {
    const cached = this.files.get(assetPath);
    if (cached) return cached;

    const { model, virtualLabId, projectId } = this;
    this.report.logTask(`Loading file "${assetPath}"...`);
    const promise = (async () => {
      const content = await downloadAsset({
        ctx: { virtualLabId, projectId },
        entityType: model.type,
        entityId: model.id,
        id: await this.asyncAssetDirectoryId,
        assetPath,
        asRawResponse: true,
      });
      return content.arrayBuffer();
    })();
    this.files.set(assetPath, promise);
    // A failed download must not poison the cache; the next call retries.
    promise.catch(() => this.files.delete(assetPath));
    return promise;
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

let h5FileId = 0;

function nextH5FileId() {
  h5FileId += 1;
  return h5FileId;
}

const AFFERENT_ATTRIBUTES = [
  'afferent_surface_x',
  'afferent_surface_y',
  'afferent_surface_z',
  'afferent_section_id',
] as const;

type TSonataNodePopulation =
  ICircuitSonataConfiguration['networks']['nodes'][number]['populations'][string];

/** One biophysical population, with the nodes file and config entry it came from. */
type TBiophysicalPopulation = {
  nodesFile: string;
  populationName: string;
  population: TSonataNodePopulation;
};

type TMorphologyLocationRule =
  | { kind: 'directory'; path: string; format: 'swc' | 'asc' | 'h5' }
  | { kind: 'container'; path: string };

/**
 * Where a population's morphology files live — OBI-One's `resolve_morph_path`, mirrored.
 *
 * A `morphologies_dir` means one SWC file per cell. Otherwise the first alternate format
 * wins: `neurolucida-asc` files or H5 — and an alternate path that already has an extension
 * is a single container file holding every morphology.
 */
export function resolveMorphologyRule(
  config: ICircuitSonataConfiguration,
  populationName: string,
  /** The population's own entry; looked up by name when the caller has only that. */
  population: TSonataNodePopulation | undefined = findPopulation(config, populationName)
): TMorphologyLocationRule {
  const components = config.components;

  const morphologiesDir = population?.morphologies_dir ?? components?.morphologies_dir;
  if (morphologiesDir) return { kind: 'directory', path: morphologiesDir, format: 'swc' };

  const alternates = population?.alternate_morphologies ?? components?.alternate_morphologies;
  const entry = alternates ? Object.entries(alternates)[0] : undefined;
  if (entry) {
    const [alternateFormat, path] = entry;
    if (hasSuffix(path)) return { kind: 'container', path };
    return {
      kind: 'directory',
      path,
      format: alternateFormat === 'neurolucida-asc' ? 'asc' : 'h5',
    };
  }

  throw new Error(`No morphologies found for population "${populationName}".`);
}

/** The `{morphology_file}` path the morphology endpoint expects for one cell. */
export function morphologyFileOf(rule: TMorphologyLocationRule, morphologyName: string): string {
  if (rule.kind === 'container') return rule.path;
  return `${rule.path}/${morphologyName}.${rule.format}`;
}

function hasSuffix(path: string): boolean {
  const basename = path.split('/').at(-1) ?? '';
  return basename.includes('.') && !basename.startsWith('.');
}

function findPopulation(config: ICircuitSonataConfiguration, name: string) {
  for (const node of config.networks.nodes) {
    const population = node.populations[name];
    if (population) return population;
  }
  return undefined;
}

export function listBiophysicalPopulations(config: ICircuitSonataConfiguration) {
  const populations: TBiophysicalPopulation[] = [];
  for (const node of config.networks.nodes) {
    for (const populationName of Object.keys(node.populations)) {
      const population = node.populations[populationName];
      if ((population.type ?? 'biophysical') !== 'biophysical') continue;
      populations.push({ nodesFile: node.nodes_file, populationName, population });
    }
  }
  // libsonata enumerates populations in codepoint order; `localeCompare` would order them
  // by the viewer's locale, shifting node indices between users of the same circuit.
  return populations.sort((a, b) => (a.populationName < b.populationName ? -1 : 1));
}

type TCircuitLoaderContext = {
  circuitId: string;
  virtualLabId: string;
  projectId: string;
};

const loaders = new Map<string, CircuitLoader>();

function loaderKey({ circuitId, virtualLabId, projectId }: TCircuitLoaderContext) {
  return `${virtualLabId}/${projectId}/${circuitId}`;
}

/** The UI shows one circuit at a time; keeping a spare covers a quick switch back. */
const MAX_CACHED_LOADERS = 2;

/** One loader per circuit, so config, nodes and edges files download once and stay cached. */
export function getCircuitLoader(context: TCircuitLoaderContext): CircuitLoader {
  const key = loaderKey(context);
  const cached = loaders.get(key);
  if (cached) {
    // Re-insert so Map iteration order is least-recently-used; without this, eviction
    // follows insertion order and can drop the circuit the user just came back to.
    loaders.delete(key);
    loaders.set(key, cached);
    return cached;
  }

  const loader = new CircuitLoader(
    { id: context.circuitId, type: EntityTypeDict.Circuit },
    context.virtualLabId,
    context.projectId
  );
  loaders.set(key, loader);
  for (const [oldestKey, oldest] of loaders) {
    if (loaders.size <= MAX_CACHED_LOADERS) break;
    loaders.delete(oldestKey);
    oldest.dispose();
  }
  return loader;
}

/** Drop the cached loader so a retry starts from fresh downloads. */
export function invalidateCircuitLoader(context: TCircuitLoaderContext) {
  const key = loaderKey(context);
  loaders.get(key)?.dispose();
  loaders.delete(key);
}
