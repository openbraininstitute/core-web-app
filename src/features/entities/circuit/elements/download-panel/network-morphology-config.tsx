import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useSetAtom } from 'jotai';

import isString from 'lodash/isString';
import compact from 'lodash/compact';
import get from 'lodash/get';

import {
  morphologiesContentConfiguration,
  networksContentConfiguration,
} from '@/features/entities/circuit/elements/download-panel/content-configuration';
import { NetworkConfigItem } from '@/features/entities/circuit/elements/download-panel/config-item';
import {
  updateFileCounterAtom,
  buildNetworksConfig,
  resolveCircuitConfigAndDirectory,
  extractWithAlternateMorphologies,
  getAssetPath,
} from '@/features/entities/circuit/elements/download-panel/helpers';
import { SkeletonItem } from '@/features/entities/circuit/elements/download-panel/skeleton';
import { Error } from '@/features/entities/circuit/elements/error';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import type {
  ICircuit,
  ICircuitSonataConfiguration,
} from '@/api/entitycore/types/entities/circuit';

import type { ConfigItemProps } from '@/features/entities/circuit/elements/download-panel/config-item';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const AssetDefaultPath = 'circuit_config.json';

export default function NetworkAndMorphologyConfig({ circuit }: { circuit: ICircuit }) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
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
  const updateFileCounter = useSetAtom(updateFileCounterAtom);
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
        const result = await resolveCircuitConfigAndDirectory<ICircuitSonataConfiguration>({
          entityId: circuit.id,
          assetId: configAsset.id,
          assetPath: AssetDefaultPath,
          context: { virtualLabId, projectId },
        });

        mutateNetworksConfig((prev) => ({
          ...prev,
          directory: result.directory,
          config: result.config,
          error: result.error,
          loading: false,
        }));
        const nodes = result.config?.networks.nodes.length;
        const edges = result.config?.networks.edges.length;
        const containerizedMorphologies = extractWithAlternateMorphologies(
          result.config?.networks.nodes ?? []
        );
        let morphologies = 0;
        if (containerizedMorphologies) {
          const list = Object.entries(containerizedMorphologies).filter(([, value]) =>
            Boolean(value.alternate_morphologies)
          );
          morphologies = list.length;
        }
        updateFileCounter({
          nodes,
          edges,
          morphologies,
        });
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
  }, [circuit?.id, configAsset?.id, virtualLabId, projectId]);

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
      return (
        <Error icon={null} title="Networks" description={err} cls={{ container: 'text-white' }} />
      );
    })
    .with({ directory: P.nullish, config: P.nonNullable }, () => (
      <Error
        icon={null}
        title="Networks"
        description="No assets directory was found"
        cls={{ container: 'text-white' }}
      />
    ))
    .with({ directory: P.nonNullable, config: P.nullish }, () => (
      <Error
        icon={null}
        title="Networks"
        description="No configuration asset was found"
        cls={{ container: 'text-white' }}
      />
    ))
    .with({ directory: P.nonNullable, config: P.nonNullable }, ({ directory, config }) => {
      const networks = buildNetworksConfig(config.networks, directory);
      const fullConfig = networksContentConfiguration.map((o) => ({
        ...o,
        ...get(networks, o.key, {}),
      })) as unknown as Record<string, Omit<ConfigItemProps, 'className'>>;

      const containerizedMorphologies = extractWithAlternateMorphologies(config.networks.nodes);
      const items = compact(
        Object.entries(containerizedMorphologies).map(([key, value]) => {
          const containerized = value.alternate_morphologies;
          if (containerized) {
            const asset = {
              path: getAssetPath(value.alternate_morphologies ?? ''),
              ...get(directory, getAssetPath(value.alternate_morphologies ?? ''), {
                name: null,
                size: null,
                last_modified: null,
              }),
            };
            const name = containerized.split('/').pop()!;
            return {
              asset,
              title: name,
              mimeType: name?.split('.').pop() ?? 'h5',
              description: `Container file for morphologies of ${key}`,
            };
          }
          return null;
        })
      );

      const morphologyConfig = {
        ...morphologiesContentConfiguration,
        count: items.length,
        items,
        showType: 'h5',
        showPrefix: null,
        emptyMessage: 'Coming soon',
      };

      return (
        <>
          {Object.values(fullConfig).map((o) => (
            <NetworkConfigItem
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
                context: { virtualLabId, projectId },
              }}
            />
          ))}
          <NetworkConfigItem
            key={morphologyConfig.key}
            name={morphologyConfig.name}
            description={morphologyConfig.description}
            count={morphologyConfig.count}
            mimeType={morphologyConfig.mimeType}
            items={morphologyConfig.items}
            showType={morphologyConfig.showType}
            showPrefix={morphologyConfig.showPrefix}
            emptyMessage={morphologyConfig.emptyMessage}
            downloadConfig={{
              entityId: circuit?.id,
              assetConfigId: configAsset?.id,
              context: { virtualLabId, projectId },
            }}
          />
        </>
      );
    })
    .otherwise(() => null);
}
