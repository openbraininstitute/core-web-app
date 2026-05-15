import { Dataset, type Entity, File as H5File, ready } from 'h5wasm';

import { downloadAsset, getAssets, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import GenericEvent from '@/util/generic-event';
import { assertType } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import { CircuitConfig } from './circuit-config';
import { Report } from './report';
import { convertSwcToTree } from './swc';

import type { DirectoryItem } from '@/api/entitycore/types/shared/global';
import type { TSupportedEntitiesForScanConfiguration } from '@/features/scan-config/types';
import type {
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
} from '@/morpho-viewer';

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

  get loaded(): boolean {
    return this._loaded;
  }
  private set loaded(loaded: boolean) {
    if (this._loaded === loaded) return;

    this._loaded = loaded;
    this.eventLoaded.dispatch(loaded);
  }

  readonly loadCell = async (id: string): Promise<MorphoViewerSmallCircuitCellData | null> => {
    try {
      const morphologyFilename = `${this.morphologiesDir}/${id}.swc`;
      console.log('Loading', morphologyFilename);
      const morphology = await this.loadText(morphologyFilename);
      const tree = convertSwcToTree(morphology);
      console.log('🐞 [circuit-loader@73] tree =', tree); // @FIXME: Remove this line written on 2026-05-15 at 09:58
      return { type: 'tree', data: tree };
    } catch (error) {
      const { report } = this;
      report.logFailure(error);
      return null;
    }
  };

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
    console.log('🐞 [circuit-loader@184] ids =', ids); // @FIXME: Remove this line written on 2026-05-15 at 10:10
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
      console.log('🐞 [circuit-loader@205] cell =', cell); // @FIXME: Remove this line written on 2026-05-15 at 10:10
      return cell;
    });
  }

  private getDataset<T>(
    file: H5File,
    path: string,
    typeChecker: (data: unknown) => asserts data is T
  ): T {
    const dataset = file.get(path);
    if (!(dataset instanceof Dataset)) {
      throw new Error(`Unable to find dataset at "${path}"!`);
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
        const cnt1 = obj1.node_id ?? 0;
        const cnt2 = obj2.node_id ?? 0;
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
