import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useSetAtom } from 'jotai';

import isString from 'es-toolkit/compat/isString';
import flatMap from 'es-toolkit/compat/flatMap';
import last from 'es-toolkit/compat/last';
import map from 'es-toolkit/compat/map';
import get from 'es-toolkit/compat/get';

import { connectivityMetricsContentConfiguration } from '@/features/entities/circuit/elements/download-panel/content-configuration';
import {
  countConnectivityPaths,
  resolveCircuitConfigAndDirectory,
  updateFileCounterAtom,
} from '@/features/entities/circuit/elements/download-panel/helpers';
import { NetworkConfigItem } from '@/features/entities/circuit/elements/download-panel/config-item';
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
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
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
  const updateFileCounter = useSetAtom(updateFileCounterAtom);
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
        const result =
          await resolveCircuitConfigAndDirectory<CircuitConnectivityMatricesConfiguration>({
            entityId: circuit.id,
            assetId: configAsset.id,
            assetPath: AssetDefaultPath,
            context: { virtualLabId, projectId },
          });

        mutateConnectivityMetrics({
          directory: result.directory,
          config: result.config,
          error: result.error,
          loading: false,
        });
        updateFileCounter({ connectivity_metrics: countConnectivityPaths(result.config) });
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
  }, [circuit?.id, configAsset?.id, virtualLabId, projectId]);

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
        <Error
          icon={null}
          title="Connectivity matrices"
          description={err}
          cls={{ container: 'text-white' }}
        />
      );
    })
    .with({ directory: P.nullish, config: P.nonNullable }, () => (
      <Error
        icon={null}
        title="Connectivity matrices"
        description="No assets directory was found"
        cls={{ container: 'text-white' }}
      />
    ))
    .with({ directory: P.nonNullable, config: P.nullish }, () => (
      <Error
        icon={null}
        title="Connectivity matrices"
        description="No configuration asset was found"
        cls={{ container: 'text-white' }}
      />
    ))
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
      const fullConfig = Object.assign(connectivityMetricsContentConfiguration, {
        type: 'connectivity_metrics',
        showType: 'connectivity matrices',
        showPrefix: 'Local connectome',
        count: items.length,
        items,
      }) as unknown as Omit<ConfigItemProps, 'className'>;

      return (
        <NetworkConfigItem
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
            context: { virtualLabId, projectId },
          }}
        />
      );
    })
    .otherwise(() => null);
}
