import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';

import isString from 'lodash/isString';
import flatMap from 'lodash/flatMap';
import last from 'lodash/last';
import map from 'lodash/map';
import get from 'lodash/get';

import { ConnectivityMetricsContentConfiguration } from '@/features/entities/circuit/elements/download-panel/content-configuration';
import { resolveCircuitConfigAndDirectory } from '@/features/entities/circuit/elements/download-panel/helpers';
import { NodeOrEdgeConfigItem } from '@/features/entities/circuit/elements/download-panel/config-item';
import { SkeletonItem } from '@/features/entities/circuit/elements/download-panel/skeleton';
import { Error } from '@/features/entities/circuit/elements/error';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';

import type { ConfigItemProps } from '@/features/entities/circuit/elements/download-panel/config-item';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import type {
  ICircuit,
  CircuitConnectivityMatricesConfiguration,
} from '@/api/entitycore/types/entities/circuit';

const AssetDefaultPath = 'matrix_config.json';

export default function ConnectivityMatrices({ circuit }: { circuit: ICircuit }) {
  const context = useParams<WorkspaceContext>();
  const [connectivityMetrics, mutateConnectivityMetrics] = useState<{
    directory: DirectoryListContent['files'] | null;
    config: CircuitConnectivityMatricesConfiguration | null;
    loading: boolean;
    error?:
      | {
          directory: string | null;
          config: string | null;
        }
      | string
      | null;
  }>({
    directory: {},
    config: {},
    loading: false,
    error: null,
  });
  const assets = circuit?.assets;
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.circuit_connectivity_matrices,
  });

  useEffect(() => {
    const getConnectivityMetrics = async () => {
      mutateConnectivityMetrics({
        loading: true,
        directory: null,
        config: null,
      });
      if (circuit && configAsset?.id) {
        const result = await resolveCircuitConfigAndDirectory({
          entityId: circuit.id,
          assetId: configAsset.id,
          assetPath: AssetDefaultPath,
          context,
        });

        mutateConnectivityMetrics({
          directory: result.directory,
          config: result.config,
          error: result.error,
          loading: false,
        });
      } else {
        mutateConnectivityMetrics({
          directory: null,
          config: null,
          error: 'Could not find circuit connectivity matrices asset',
          loading: false,
        });
      }
    };
    getConnectivityMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit?.id, configAsset, context]);

  return match(connectivityMetrics)
    .with({ loading: true }, () => <SkeletonItem />)
    .with({ error: P.string.select() }, () => {
      let err = '';
      if (isString(connectivityMetrics.error)) err = connectivityMetrics.error;
      else if (connectivityMetrics.error?.directory && connectivityMetrics.error?.config)
        err = 'Failed to load connectivity matrices configuration and directory assets';
      else if (connectivityMetrics.error?.directory) err = connectivityMetrics.error.directory;
      else if (connectivityMetrics.error?.config) err = connectivityMetrics.error.config;
      return (
        <Error icon={null} title="Connectivity matrices" description={err} className="text-white" />
      );
    })
    .with({ directory: P.nullish, config: P.nonNullable }, () => <div>No directory</div>)
    .with({ directory: P.nonNullable, config: P.nullish }, () => <div>No config</div>)
    .with({ directory: P.nonNullable, config: P.nonNullable }, ({ directory, config }) => {
      const items = flatMap(config || {}, (group) =>
        map(group, ({ path, description }) => {
          const title = last(path.split('/'));
          const mimeType = last(title?.split('.'));
          const asset = {
            ...get(directory, path, {
              name: null,
              size: null,
              last_modified: null,
            }),
            path,
          };

          return {
            asset,
            title,
            mimeType,
            description,
            subItems: null,
          };
        })
      );
      const fullConfig = Object.assign(ConnectivityMetricsContentConfiguration, {
        type: 'connectivity_metrics',
        showType: 'connectivity matrices',
        showPrefix: 'Local connectome',
        count: items.length,
        items,
      }) as unknown as Omit<ConfigItemProps, 'className'>;
      return (
        <NodeOrEdgeConfigItem
          key={fullConfig.key}
          name={fullConfig.name}
          description={fullConfig.description}
          count={fullConfig.count}
          mimeType={fullConfig.mimeType}
          items={fullConfig.items}
          showType={fullConfig.showType}
          showPrefix={fullConfig.showPrefix}
          downloadConfig={{
            entityId: circuit?.id,
            assetConfigId: configAsset?.id!,
            context,
          }}
        />
      );
    })
    .otherwise(() => null);
}
