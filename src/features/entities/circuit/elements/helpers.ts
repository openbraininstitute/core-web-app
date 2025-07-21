import toPairs from 'lodash/toPairs';
import get from 'lodash/get';

import { EmptyValue } from '@/entity-configuration/definitions/renderer';

import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type {
  CircuitConfigNetworks,
  EdgeConfigItem,
  NodeConfigItem,
} from '@/api/entitycore/types/entities/circuit';

export function buildNetworksConfig(
  networks: CircuitConfigNetworks,
  directory: DirectoryListContent['files']
) {
  const edges = networks.edges.map((o) =>
    buildConfigItem({ item: o, selector: 'edges_file', directory })
  );
  const nodes = networks.nodes.map((o) =>
    buildConfigItem({ item: o, selector: 'nodes_file', directory })
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

function buildConfigItem({
  item,
  selector,
  directory,
}: {
  item: NodeConfigItem | EdgeConfigItem;
  selector: 'edges_file' | 'nodes_file';
  directory: DirectoryListContent['files'];
}) {
  const path = get(item, selector, EmptyValue);
  const title = path.split('/').pop();
  const populations = toPairs(get(item, 'populations', {})).map(([key, value]) => {
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
    populations,
  };
}

function getAssetPath(path: string): string {
  const prefix = '$BASE_DIR/';
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
