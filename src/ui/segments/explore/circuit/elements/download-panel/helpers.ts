import escapeRegExp from 'es-toolkit/compat/escapeRegExp';
import get from 'es-toolkit/compat/get';
import has from 'es-toolkit/compat/has';
import isEmpty from 'es-toolkit/compat/isEmpty';
import map from 'es-toolkit/compat/map';
import reduce from 'es-toolkit/compat/reduce';
import sumBy from 'es-toolkit/compat/sumBy';
import toPairs from 'es-toolkit/compat/toPairs';
import values from 'es-toolkit/compat/values';
import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';

import { downloadAsset, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types';
import { EmptyValue } from '@/entity-configuration/definitions/renderer';

import type {
  CircuitConnectivityMatricesConfiguration,
  SonataCircuitComponentConfig,
  SonataCircuitConfigNetworks,
  SonataCircuitNetworkEdgeConfigItem,
  SonataCircuitNetworkNodeConfigItem,
} from '@/api/entitycore/types/entities/circuit';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type { TCircuitContentConfigurationKeys } from '@/ui/segments/explore/circuit/elements/download-panel/content-configuration';

type FilesCount = Record<TCircuitContentConfigurationKeys, number>;

export const fileCounterAtom = atomFamily((key: string) => {
  const childAtom = atom<FilesCount | null>(null);
  childAtom.debugLabel = `file-counter-${key}`;
  return childAtom;
});

export const updateFileCounterAtom = atomFamily((key: string) => {
  const fileCounter = fileCounterAtom(key);
  const childAtom = atom(null, (innerGet, set, update: Partial<FilesCount> | null) => {
    const current = innerGet(fileCounter) ?? {
      connectivity_metrics: 0,
      morphologies: 0,
      nodes: 0,
      edges: 0,
      configuration_files: 0,
      electrical_models: 0,
      mechanisms: 0,
    };
    if (update) {
      set(fileCounter, {
        ...current,
        ...update,
      });
    } else {
      set(fileCounter, null);
    }
  });
  childAtom.debugLabel = `update-file-counter-${key}`;
  return childAtom;
});

export function buildNetworkConfigItem({
  item,
  selector,
  directory,
  manifest,
}: {
  item: SonataCircuitNetworkEdgeConfigItem | SonataCircuitNetworkNodeConfigItem;
  selector: 'edges_file' | 'nodes_file';
  directory: DirectoryListContent['files'];
  manifest?: Record<string, string>;
}) {
  const path = get(item, selector, EmptyValue);
  const title = path.split('/').pop();
  const subItems = toPairs(get(item, 'populations', {})).map(([key, value]) => {
    return {
      title: key,
      type: value.type,
    };
  });
  const mimeType = get(item, selector, EmptyValue).split('/').pop()?.split('.')?.pop();

  const result = {
    type: selector,
    asset: {
      path: getAssetPath(path, manifest),
      ...get(directory, getAssetPath(path, manifest), {
        name: null,
        size: null,
        last_modified: null,
      }),
    },
    title,
    mimeType,
    subItems,
  };

  return result;
}

export function buildNetworksConfig(
  networks: SonataCircuitConfigNetworks,
  directory: DirectoryListContent['files'],
  manifest?: Record<string, string>
) {
  const edges = networks.edges.map((o) =>
    buildNetworkConfigItem({
      item: o,
      selector: 'edges_file',
      directory,
      manifest,
    })
  );
  const nodes = networks.nodes.map((o) =>
    buildNetworkConfigItem({
      item: o,
      selector: 'nodes_file',
      directory,
      manifest,
    })
  );

  return {
    edges: {
      showType: null,
      items: edges,
      count: edges.length,
      showPrefix: 'Edge populations:',
    },
    nodes: {
      showType: 'nodes',
      showPrefix: 'Node populations:',
      items: nodes,
      count: nodes.length,
    },
  };
}

export function getAssetPath(path: string, manifest?: Record<string, string>): string {
  if (!manifest || isEmpty(manifest)) {
    return sanitizePath(path);
  }

  let resolvedPath = path;
  const maxIterations = 50; // Prevent infinite loops
  let iteration = 0;

  // Keep replacing variables until no more variables exist or max iterations reached
  while (resolvedPath.includes('$') && iteration < maxIterations) {
    const previousPath = resolvedPath;

    // Use  es-toolkit's reduce for efficient variable replacement
    resolvedPath = reduce(
      manifest,
      (currentPath, value, key) => {
        // Use global regex replace for all occurrences
        return currentPath.replace(new RegExp(escapeRegExp(key), 'g'), value);
      },
      resolvedPath
    );

    // Break if no changes were made (no more replacements possible)
    if (previousPath === resolvedPath) {
      break;
    }

    iteration++;
  }

  return sanitizePath(resolvedPath);
}

function sanitizePath(path: string): string {
  let sanitized = path.replace(/^\.\//, ''); // Remove leading ./
  sanitized = sanitized.replace(/^\/+/, ''); // Remove leading slashes
  return sanitized;
}

export type ConfigurationFileItem = {
  path: string;
  title: string;
  size: number | null;
};

export type FolderEntry = {
  prefix: string;
  label: string;
  fileCount: number;
  totalSize: number;
};

const CIRCUIT_CONFIG_PATH = 'circuit_config.json';
const DEFAULT_ID_MAPPING_PATH = 'id_mapping.json';

function filterDirectoryByPrefix(
  directory: DirectoryListContent['files'],
  prefix: string
): Array<{ path: string; size: number }> {
  const normalized = prefix.endsWith('/') ? prefix : `${prefix}/`;
  return Object.entries(directory)
    .filter(([path]) => path.startsWith(normalized))
    .map(([path, meta]) => ({ path, size: meta.size }));
}

function buildFolderEntry(
  rawPath: string,
  manifest: Record<string, string> | undefined,
  directory: DirectoryListContent['files']
): FolderEntry | null {
  const resolved = getAssetPath(rawPath, manifest);
  if (!resolved) return null;
  const files = filterDirectoryByPrefix(directory, resolved);
  return {
    prefix: resolved,
    label: resolved.split('/').filter(Boolean).pop() ?? resolved,
    fileCount: files.length,
    totalSize: files.reduce((acc, f) => acc + (f.size ?? 0), 0),
  };
}

export function buildConfigurationFiles(
  config: {
    node_sets_file?: string;
    components?: { provenance?: { id_mapping?: string } };
    manifest?: Record<string, string>;
  },
  directory: DirectoryListContent['files']
): ConfigurationFileItem[] {
  const items: Array<{ path: string; title: string }> = [
    { path: CIRCUIT_CONFIG_PATH, title: 'Circuit config' },
  ];
  if (config.node_sets_file) {
    items.push({
      path: getAssetPath(config.node_sets_file, config.manifest),
      title: 'Node sets',
    });
  }
  // Use `components.provenance.id_mapping` from the config,
  // fall back to `id_mapping.json` if the file exists.
  const idMappingFromConfig = config.components?.provenance?.id_mapping;
  const idMappingPath = idMappingFromConfig
    ? getAssetPath(idMappingFromConfig, config.manifest)
    : directory[DEFAULT_ID_MAPPING_PATH]
      ? DEFAULT_ID_MAPPING_PATH
      : null;
  if (idMappingPath) {
    items.push({ path: idMappingPath, title: 'ID mapping' });
  }
  return items.map(({ path, title }) => ({
    path,
    title,
    size: directory[path]?.size ?? null,
  }));
}

export function buildElectricalModelsEntries(
  config: {
    components?: { biophysical_neuron_models_dir?: string };
    networks?: { nodes?: Array<SonataCircuitNetworkNodeConfigItem> };
    manifest?: Record<string, string>;
  },
  directory: DirectoryListContent['files']
): FolderEntry[] {
  const candidates = new Set<string>();
  const topLevel = config.components?.biophysical_neuron_models_dir;
  if (topLevel) candidates.add(topLevel);
  for (const node of config.networks?.nodes ?? []) {
    for (const pop of Object.values(node.populations ?? {})) {
      if (pop.biophysical_neuron_models_dir) {
        candidates.add(pop.biophysical_neuron_models_dir);
      }
    }
  }
  const entries: FolderEntry[] = [];
  const seenPrefixes = new Set<string>();
  for (const raw of candidates) {
    const entry = buildFolderEntry(raw, config.manifest, directory);
    if (entry && !seenPrefixes.has(entry.prefix)) {
      seenPrefixes.add(entry.prefix);
      entries.push(entry);
    }
  }
  return entries;
}

const DEFAULT_MECHANISMS_DIR = 'mod';

export function buildMechanismsEntry(
  config: { components?: { mechanisms_dir?: string }; manifest?: Record<string, string> },
  directory: DirectoryListContent['files']
): FolderEntry | null {
  // Per ticket: the spec field is `components.mechanisms_dir`, but in practice it's not yet
  // populated by circuit builders and mod files are hard-coded to `/mod`.
  // See https://github.com/openbraininstitute/prod-build-circuit/issues/32
  const raw = config.components?.mechanisms_dir || DEFAULT_MECHANISMS_DIR;
  const entry = buildFolderEntry(raw, config.manifest, directory);
  if (!entry || entry.fileCount === 0) return null;
  return entry;
}

export function countConnectivityPaths(
  config: CircuitConnectivityMatricesConfiguration | null
): number {
  if (!config) return 0;
  return sumBy(values(config), (inner) => values(inner).filter((item) => !!item.path).length);
}

type PopulationWithMorphology = {
  type: string;
  alternate_morphologies?: string;
};

export const extractWithAlternateMorphologies = (
  sections: Array<SonataCircuitNetworkNodeConfigItem>,
  components?: SonataCircuitComponentConfig | undefined
): Record<string, PopulationWithMorphology> => {
  let alternateMorpho = sections
    .flatMap((section) =>
      map(section.populations, (popValue, popName) => ({
        name: popName,
        ...popValue,
      }))
    )
    .filter((pop) => has(pop, 'alternate_morphologies'))
    .reduce((acc: Record<string, PopulationWithMorphology>, pop) => {
      acc[pop.name] = {
        type: pop.type,
        alternate_morphologies: pop.alternate_morphologies?.h5v1,
      };
      return acc;
    }, {});

  if (Object.keys(alternateMorpho ?? {}).length <= 0) {
    alternateMorpho = Object.entries(components?.alternate_morphologies ?? {}).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          type: key,
          alternate_morphologies: value,
        };
        return acc;
      },
      {} as Record<string, PopulationWithMorphology>
    );
  }
  return alternateMorpho;
};

export async function resolveCircuitConfigAndDirectory<T>({
  entityId,
  assetId,
  assetPath,
  context,
}: {
  entityId: string;
  assetId: string;
  assetPath: string;
  context: WorkspaceContext;
}): Promise<{
  directory: DirectoryListContent['files'] | null;
  config: T | null;
  error?: {
    directory: string | null;
    config: string | null;
  } | null;
}> {
  try {
    const [listingDirectoryPromise, configPromise] = await Promise.allSettled([
      listDirectoryOfAssets({
        entityType: EntityTypeDict.Circuit,
        entityId,
        id: assetId,
        ctx: context,
      }),
      downloadAsset({
        entityType: EntityTypeDict.Circuit,
        entityId,
        id: assetId,
        asRawResponse: true,
        assetPath,
        ctx: context,
      }),
    ]);

    const directory =
      listingDirectoryPromise.status === 'fulfilled' ? listingDirectoryPromise.value.files : null;
    const config = configPromise.status === 'fulfilled' ? await configPromise.value.json() : null;

    let error: {
      directory: string | null;
      config: string | null;
    } | null = null;
    if (configPromise.status === 'rejected') {
      error = {
        directory: null,
        config: 'Failed to download configuration',
      };
    }
    if (listingDirectoryPromise.status === 'rejected') {
      error = {
        directory: 'Failed to list directory',
        config: null,
      };
    }

    return {
      directory,
      config,
      error,
    };
  } catch (error) {
    return {
      directory: null,
      config: null,
      error: error as {
        directory: string;
        config: string;
      },
    };
  }
}
