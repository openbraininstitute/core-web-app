import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import isString from 'lodash/isString';
import get from 'lodash/get';

import { NetworksContentConfiguration } from '@/features/entities/circuit/elements/download-panel/content-configuration';
import { NodeOrEdgeConfigItem } from '@/features/entities/circuit/elements/download-panel/config-item';
import { SkeletonItem } from '@/features/entities/circuit/elements/download-panel/skeleton';
import { Error } from '@/features/entities/circuit/elements/error';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import {
  buildNetworksConfig,
  resolveCircuitConfigAndDirectory,
} from '@/features/entities/circuit/elements/download-panel/helpers';

import type {
  ICircuit,
  ICircuitSonataConfiguration,
} from '@/api/entitycore/types/entities/circuit';

import type { ConfigItemProps } from '@/features/entities/circuit/elements/download-panel/config-item';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const AssetDefaultPath = 'circuit_config.json';

export default function NodesAndEdgesConfig({ circuit }: { circuit: ICircuit }) {
  const context = useParams<WorkspaceContext>();
  const [networksConfig, mutateNetworksConfig] = useState<{
    loading: boolean;
    error?:
      | {
          directory: string | null;
          config: string | null;
        }
      | string
      | null;
    directory: DirectoryListContent['files'] | null;
    config: ICircuitSonataConfiguration | null;
  }>({
    loading: false,
    error: null,
    directory: null,
    config: null,
  });

  const assets = circuit?.assets;
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.sonata_circuit,
  });

  useEffect(() => {
    async function getSonataCircuitConfig() {
      mutateNetworksConfig({
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
        mutateNetworksConfig((prev) => ({
          ...prev,
          directory: result.directory,
          config: result.config,
          error: result.error,
          loading: false,
        }));
      } else {
        mutateNetworksConfig({
          directory: null,
          config: null,
          error: 'Could not find sonata circuit configuration asset',
          loading: false,
        });
      }
    }

    getSonataCircuitConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit?.id, configAsset, context]);

  return match(networksConfig)
    .with({ loading: true }, () => (
      <div className="flex flex-col gap-10">
        <SkeletonItem itemsCount={3} />
        <SkeletonItem className="opacity-75" itemsCount={3} />
      </div>
    ))
    .with({ error: P.string.select() }, () => {
      let err = '';
      if (isString(networksConfig.error)) err = networksConfig.error;
      else if (networksConfig.error?.directory && networksConfig.error?.config)
        err = 'Failed to load networks configuration and directory assets';
      else if (networksConfig.error?.directory) err = networksConfig.error.directory;
      else if (networksConfig.error?.config) err = networksConfig.error.config;
      return <Error icon={null} title="Networks" description={err} className="text-white" />;
    })
    .with({ directory: P.nullish, config: P.nonNullable }, () => <div>No directory</div>)
    .with({ directory: P.nonNullable, config: P.nullish }, () => <div>No config</div>)
    .with({ directory: P.nonNullable, config: P.nonNullable }, ({ directory, config }) => {
      const networks = buildNetworksConfig(config.networks, directory);
      const fullConfig = NetworksContentConfiguration.map((o) => ({
        ...o,
        ...get(networks, o.key, {}),
      })) as unknown as Record<string, Omit<ConfigItemProps, 'className'>>;

      return (
        <>
          {Object.values(fullConfig).map((o) => (
            <NodeOrEdgeConfigItem
              key={o.key}
              name={o.name}
              description={o.description}
              count={o.count}
              mimeType={o.mimeType}
              items={o.items}
              showType={o.showType}
              showPrefix={o.showPrefix}
              downloadConfig={{
                entityId: circuit?.id,
                assetConfigId: configAsset?.id,
                context,
              }}
            />
          ))}
        </>
      );
    })
    .otherwise(() => null);
}
