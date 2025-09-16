import { atom } from 'jotai';
import toPairs from 'lodash/toPairs';
import values from 'lodash/values';
import sumBy from 'lodash/sumBy';
import map from 'lodash/map';
import get from 'lodash/get';
import has from 'lodash/has';

import { downloadAsset, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { EmptyValue } from '@/entity-configuration/definitions/renderer';
import { EntityTypeEnum } from '@/api/entitycore/types';

import type { TCircuitContentConfigurationKeys } from '@/features/entities/circuit/elements/download-panel/content-configuration';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type {
  CircuitConnectivityMatricesConfiguration,
  SonataCircuitConfigNetworks,
  SonataCircuitNetworkEdgeConfigItem,
  SonataCircuitNetworkNodeConfigItem,
} from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type FilesCount = Record<TCircuitContentConfigurationKeys, number>;

export const fileCounterAtom = atom<FilesCount | null>(null);
export const updateFileCounterAtom = atom(
  null,
  (innerGet, set, update: Partial<FilesCount> | null) => {
    const current = innerGet(fileCounterAtom) ?? {
      connectivity_metrics: 0,
      morphologies: 0,
      nodes: 0,
      edges: 0,
    };
    if (update) {
      set(fileCounterAtom, {
        ...current,
        ...update,
      });
    } else {
      set(fileCounterAtom, null);
    }
  }
);

export function buildNetworkConfigItem({
  item,
  selector,
  directory,
}: {
  item: SonataCircuitNetworkEdgeConfigItem | SonataCircuitNetworkNodeConfigItem;
  selector: 'edges_file' | 'nodes_file';
  directory: DirectoryListContent['files'];
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
  return {
    type: selector,
    asset: {
      path: getAssetPath(path),
      ...get(directory, getAssetPath(path), { name: null, size: null, last_modified: null }),
    },
    title,
    mimeType,
    subItems,
  };
}

export function buildNetworksConfig(
  networks: SonataCircuitConfigNetworks,
  directory: DirectoryListContent['files']
) {
  const edges = networks.edges.map((o) =>
    buildNetworkConfigItem({ item: o, selector: 'edges_file', directory })
  );
  const nodes = networks.nodes.map((o) =>
    buildNetworkConfigItem({ item: o, selector: 'nodes_file', directory })
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

export function getAssetPath(path: string): string {
  const prefix = '$BASE_DIR/';
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
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
  sections: Array<SonataCircuitNetworkNodeConfigItem>
): Record<string, PopulationWithMorphology> => {
  return sections
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
        entityType: EntityTypeEnum.Circuit,
        entityId,
        id: assetId,
        ctx: context,
      }),
      downloadAsset({
        entityType: EntityTypeEnum.Circuit,
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
