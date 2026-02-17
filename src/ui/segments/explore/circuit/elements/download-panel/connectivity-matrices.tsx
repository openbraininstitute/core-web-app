import { useQuery } from '@tanstack/react-query';
import flatMap from 'es-toolkit/compat/flatMap';
import get from 'es-toolkit/compat/get';
import isString from 'es-toolkit/compat/isString';
import last from 'es-toolkit/compat/last';
import map from 'es-toolkit/compat/map';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { NetworkConfigItem } from '@/ui/segments/explore/circuit/elements/download-panel/config-item';
import { connectivityMetricsContentConfiguration } from '@/ui/segments/explore/circuit/elements/download-panel/content-configuration';
import { DownloadPanelError } from '@/ui/segments/explore/circuit/elements/download-panel/error';
import {
  countConnectivityPaths,
  resolveCircuitConfigAndDirectory,
  updateFileCounterAtom,
} from '@/ui/segments/explore/circuit/elements/download-panel/helpers';
import { SkeletonItem } from '@/ui/segments/explore/circuit/elements/download-panel/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type {
  CircuitConnectivityMatricesConfiguration,
  ICircuit,
} from '@/api/entitycore/types/entities/circuit';
import type { ConfigItemProps } from '@/ui/segments/explore/circuit/elements/download-panel/config-item';

const AssetDefaultPath = 'matrix_config.json';

export default function ConnectivityMatrices({ circuit }: { circuit: ICircuit }) {
  const { virtualLabId, projectId } = useWorkspace();

  const updateFileCounter = useSetAtom(updateFileCounterAtom(circuit.id));
  const assets = circuit?.assets;
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.circuit_connectivity_matrices,
  });

  const connectivityMetrics = useQuery({
    queryKey: keyBuilder.asset({
      entityId: circuit.id,
      assetId: configAsset?.id!,
      assetPath: AssetDefaultPath,
      context: { virtualLabId, projectId },
    }),
    queryFn: () =>
      resolveCircuitConfigAndDirectory<CircuitConnectivityMatricesConfiguration>({
        entityId: circuit.id,
        assetId: configAsset?.id,
        assetPath: AssetDefaultPath,
        context: { virtualLabId, projectId },
      }),
    enabled: !!circuit && !!configAsset?.id,
    select: (result) => {
      return {
        directory: result.directory,
        config: result.config,
        connectivity_metrics: countConnectivityPaths(result.config),
        error: result.error,
      };
    },
  });

  useEffect(() => {
    updateFileCounter({
      connectivity_metrics: connectivityMetrics.data?.connectivity_metrics ?? 0,
    });
  }, [connectivityMetrics.data?.connectivity_metrics, updateFileCounter]);

  return match(connectivityMetrics)
    .with({ isLoading: true }, () => <SkeletonItem />)
    .with(
      { data: { error: P.string.select('error') }, error: P.select('catchError') },
      ({ error }) => {
        let err = '';
        if (isString(connectivityMetrics.error)) err = connectivityMetrics.error;
        else if (error?.directory && error?.config)
          err = 'Failed to load connectivity matrices configuration and directory assets';
        else if (error?.directory) err = error.directory;
        else if (error?.config) err = error.config;
        return (
          <DownloadPanelError
            icon={null}
            title="Connectivity matrices"
            description={err}
            cls={{ container: 'text-white' }}
          />
        );
      }
    )
    .with({ data: { directory: P.nullish, config: P.nonNullable } }, () => (
      <DownloadPanelError
        icon={null}
        title="Connectivity matrices"
        description="No assets directory was found"
        cls={{ container: 'text-white' }}
      />
    ))
    .with({ data: { directory: P.nonNullable, config: P.nullish } }, () => (
      <DownloadPanelError
        icon={null}
        title="Connectivity matrices"
        description="No configuration asset was found"
        cls={{ container: 'text-white' }}
      />
    ))
    .with(
      {
        data: {
          directory: P.nonNullable.select('directory'),
          config: P.nonNullable.select('config'),
        },
      },
      ({ directory, config }) => {
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
      }
    )
    .otherwise(() => null);
}
