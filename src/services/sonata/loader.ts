import { Dataset, File as H5File, ready } from 'h5wasm';

import { downloadAsset, getAssets } from '@/api/entitycore/queries/assets';
import { assertArray, assertArrayNumber } from '@/util/type-guards';
import { logDebug, logError } from '@/utils/logger';

import { CircuitConfig } from './circuit-config';
import {
  assertNodeSets,
  type SonataNode,
  type SonataNodeSets,
  type SonataPopulation,
} from './types';
import { bubbleError, resolveError } from './utils';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';

export class ServiceSonataLoader {
  public steps: string[] = [];

  private _asyncAssetDirectoryId: Promise<string> | null = null;
  private _asyncCircuitConfig: Promise<ICircuitSonataConfiguration> | null = null;
  private _asyncNodeSets: Promise<SonataNodeSets> | null = null;
  private _asyncPopulations: Promise<Record<string, SonataPopulation>> | null = null;
  private readonly _files = new Map<string, Promise<ArrayBuffer>>();

  constructor(
    private readonly context: {
      virtualLabId: string;
      projectId: string;
      modelId: string;
      modelType: TEntityTypeDict;
    }
  ) {}

  get asyncCircuitConfig(): Promise<ICircuitSonataConfiguration> {
    if (!this._asyncCircuitConfig) {
      this._asyncCircuitConfig = this.loadConfigFile();
    }
    return this._asyncCircuitConfig;
  }

  get asyncNodeSets(): Promise<SonataNodeSets> {
    if (!this._asyncNodeSets) {
      this._asyncNodeSets = this.loadNodeSets();
    }
    return this._asyncNodeSets;
  }

  get asyncPopulations(): Promise<Record<string, SonataPopulation>> {
    if (!this._asyncPopulations) {
      this._asyncPopulations = this.loadPopulations();
    }
    return this._asyncPopulations;
  }

  async getNodesOfPopulation(population: SonataPopulation) {
    try {
      const nodes: SonataNode[] = [];
      for (const file of population.files) {
        const nodesFile = await this.loadH5(file);
        const positionX = this.getDataset(
          nodesFile,
          `nodes/${population.name}/0/x`,
          assertArrayNumber
        );
        const positionY = this.getDataset(
          nodesFile,
          `nodes/${population.name}/0/y`,
          assertArrayNumber
        );
        const positionZ = this.getDataset(
          nodesFile,
          `nodes/${population.name}/0/z`,
          assertArrayNumber
        );
        const ids = this.getDataset(
          nodesFile,
          `nodes/${population.name}/0/morphology`,
          assertArray,
          new Array(positionX.length).fill(-1)
        );
        ids.forEach((id, index) => {
          nodes.push({
            morphologyId: `${id}`,
            position: [positionX[index], positionY[index], positionZ[index]],
          });
        });
      }
      return nodes;
    } catch (ex) {
      this.asyncCircuitConfig.then(logDebug);
      bubbleError(ex, `while getting nodes from population "${population.name}".`);
    }
  }

  async loadText(assetPath: string): Promise<string> {
    const data = await this.loadFile(assetPath);
    const text = new TextDecoder().decode(data);
    return text;
  }

  async loadJSON(assetPath: string): Promise<unknown> {
    const text = await this.loadText(assetPath);
    const json = JSON.parse(text);
    return json;
  }

  async loadH5(assetPath: string): Promise<H5File> {
    try {
      const data = await this.loadFile(assetPath);
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
      this.logStep(`HDF5 parsing of "${assetPath}".`);
      return file;
    } catch (ex) {
      bubbleError(ex, `while loading H5 file "${assetPath}".`);
    }
  }

  async loadFile(assetPath: string): Promise<ArrayBuffer> {
    try {
      const cachedFile = this._files.get(assetPath);
      if (cachedFile) return cachedFile;

      const promise = new Promise<ArrayBuffer>((resolve, reject) => {
        const action = async () => {
          try {
            const { virtualLabId, projectId, modelId, modelType } = this.context;
            const content = await downloadAsset({
              ctx: { virtualLabId, projectId },
              entityType: modelType,
              entityId: modelId,
              id: await this.asyncAssetDirectoryId,
              assetPath,
              asRawResponse: true,
            });
            const buffer = await content.arrayBuffer();
            this.logStep(`Loaded ${Math.ceil(buffer.byteLength / 1024)} Kb from "${assetPath}".`);
            resolve(buffer);
          } catch (ex) {
            reject(ex);
          }
        };
        action();
      });
      this._files.set(assetPath, promise);
      return promise;
    } catch (ex) {
      bubbleError(ex, `while loading file "${assetPath}".`);
    }
  }

  private getDataset<T>(
    file: H5File,
    path: string,
    typeChecker: (data: unknown) => asserts data is T,
    defaultValue?: T
  ): T {
    try {
      const dataset = file.get(path);
      if (!(dataset instanceof Dataset)) {
        if (defaultValue !== undefined) return defaultValue;

        logError(
          `Unable to find dataset at "${path}"!\nAvailable paths are:\n${listAvailablePaths(file)}`
        );
        throw new Error(`Unable to find dataset at "${path}"!`);
      }

      const data = dataset.json_value;
      try {
        typeChecker(data);
        return data;
      } catch (ex) {
        logError('Unexpected dataset type:', data);
        throw ex;
      }
    } catch (ex) {
      throw new Error(`Error while reading dataset at "${path}": ${resolveError(ex)}`);
    }
  }

  private get asyncAssetDirectoryId(): Promise<string> {
    if (this._asyncAssetDirectoryId === null) {
      this._asyncAssetDirectoryId = this.loadAssetDirectoryId();
    }
    return this._asyncAssetDirectoryId;
  }

  private async loadAssetDirectoryId(): Promise<string> {
    try {
      const { virtualLabId, projectId, modelId, modelType } = this.context;
      const assets = await getAssets({
        ctx: { virtualLabId, projectId },
        entityType: modelType,
        entityId: modelId,
      });
      const assetDirectory = assets.data.find((asset) => asset.label === 'sonata_circuit');
      if (!assetDirectory) throw new Error('No asset directory found!');

      return assetDirectory.id;
    } catch (ex) {
      bubbleError(ex, 'while loading asset directory id.');
    }
  }

  private async loadNodeSets(): Promise<SonataNodeSets> {
    try {
      const circuitConfig = await this.asyncCircuitConfig;
      const nodeSets = await this.loadJSON(circuitConfig.node_sets_file);
      assertNodeSets(nodeSets);
      return nodeSets;
    } catch (ex) {
      bubbleError(ex, 'while loading node sets.');
    }
  }

  private async loadConfigFile(): Promise<ICircuitSonataConfiguration> {
    try {
      const circuitConfig = new CircuitConfig(await this.loadJSON('circuit_config.json'));
      return circuitConfig.config;
    } catch (ex) {
      bubbleError(ex, 'while loading config file.');
    }
  }

  private async loadPopulations(): Promise<Record<string, SonataPopulation>> {
    try {
      const circuitConfig = await this.asyncCircuitConfig;
      const nodeSets = await this.asyncNodeSets;
      const populationsAggregator: Record<
        string,
        {
          nodeIdsSet: Set<number>;
        }
      > = {};
      for (const nodeSet of Object.values(nodeSets)) {
        const population = getOrAdd(populationsAggregator, nodeSet.population);
        if (Array.isArray(nodeSet.node_id)) {
          for (const id of nodeSet.node_id) population.nodeIdsSet.add(id);
        }
      }
      const populations: Record<string, SonataPopulation> = {};
      for (const name of Object.keys(populationsAggregator)) {
        const { nodeIdsSet } = populationsAggregator[name];
        populations[name] = {
          name,
          nodeIds: Array.from(nodeIdsSet),
          files: circuitConfig.networks.nodes
            .filter((node) => !!node.populations[name])
            .map((node) => node.nodes_file),
        };
      }
      return populations;
    } catch (ex) {
      bubbleError(ex, 'while loading populations.');
    }
  }

  logStep(step: string) {
    this.steps.push(step);
    console.log(
      this.steps
        .map((text, index) => `${(index + 1).toString().padStart(2, ' ')}. ${text}`)
        .join('\n')
    );
  }
}

function getOrAdd(populations: Record<string, { nodeIdsSet: Set<number> }>, population: string) {
  const item = populations[population];
  if (item) return item;

  const newItem = { nodeIdsSet: new Set<number>() };
  populations[population] = newItem;
  return newItem;
}

function listAvailablePaths(file: H5File) {
  const paths = file.paths();
  return paths.map((path) => `  ${path}\n`).join('');
}
