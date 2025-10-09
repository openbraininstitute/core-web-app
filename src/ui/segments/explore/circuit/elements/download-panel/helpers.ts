import { atomFamily } from 'jotai/utils';
import { atom } from 'jotai';

import escapeRegExp from 'lodash/escapeRegExp';
import isEmpty from 'lodash/isEmpty';
import toPairs from 'lodash/toPairs';
import reduce from 'lodash/reduce';
import values from 'lodash/values';
import sumBy from 'lodash/sumBy';
import map from 'lodash/map';
import get from 'lodash/get';
import has from 'lodash/has';

import { downloadAsset, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { EmptyValue } from '@/entity-configuration/definitions/renderer';
import { EntityTypeDict } from '@/api/entitycore/types';

import type { TCircuitContentConfigurationKeys } from '@/ui/segments/explore/circuit/elements/download-panel/content-configuration';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type {
  CircuitConnectivityMatricesConfiguration,
  SonataCircuitComponentConfig,
  SonataCircuitConfigNetworks,
  SonataCircuitNetworkEdgeConfigItem,
  SonataCircuitNetworkNodeConfigItem,
} from '@/api/entitycore/types/entities/circuit';

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
    buildNetworkConfigItem({ item: o, selector: 'edges_file', directory, manifest })
  );
  const nodes = networks.nodes.map((o) =>
    buildNetworkConfigItem({ item: o, selector: 'nodes_file', directory, manifest })
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

    // Use lodash's reduce for efficient variable replacement
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
