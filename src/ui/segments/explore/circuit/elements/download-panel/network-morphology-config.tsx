import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { match, P } from 'ts-pattern';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

import isString from 'lodash/isString';
import compact from 'lodash/compact';
import get from 'lodash/get';

import { NetworkConfigItem } from '@/ui/segments/explore/circuit/elements/download-panel/config-item';
import { SkeletonItem } from '@/ui/segments/explore/circuit/elements/download-panel/skeleton';
import {
  morphologiesContentConfiguration,
  networksContentConfiguration,
} from '@/ui/segments/explore/circuit/elements/download-panel/content-configuration';
import { Error } from '@/ui/segments/explore/circuit/elements/download-panel/error';
import {
  updateFileCounterAtom,
  buildNetworksConfig,
  resolveCircuitConfigAndDirectory,
  extractWithAlternateMorphologies,
  getAssetPath,
} from '@/ui/segments/explore/circuit/elements/download-panel/helpers';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { keyBuilder } from '@/ui/use-query-keys/data';
import type {
  ICircuit,
  ICircuitSonataConfiguration,
} from '@/api/entitycore/types/entities/circuit';

import type { ConfigItemProps } from '@/ui/segments/explore/circuit/elements/download-panel/config-item';
import type { WorkspaceContext } from '@/types/common';

const AssetDefaultPath = 'circuit_config.json';

export default function NetworkAndMorphologyConfig({ circuit }: { circuit: ICircuit }) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();

  const updateFileCounter = useSetAtom(updateFileCounterAtom(circuit.id));
  const assets = circuit?.assets;
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.sonata_circuit,
  });

  const networksConfig = useQuery({
    queryKey: keyBuilder.asset({
      entityId: circuit.id,
      assetId: configAsset!.id,
      assetPath: AssetDefaultPath,
      context: { virtualLabId, projectId },
    }),
    queryFn: () =>
      resolveCircuitConfigAndDirectory<ICircuitSonataConfiguration>({
        entityId: circuit.id,
        assetId: configAsset!.id,
        assetPath: AssetDefaultPath,
        context: { virtualLabId, projectId },
      }),
    enabled: !!circuit && !!configAsset!.id,
    select: (result) => {
      return {
        directory: result.directory,
        config: result.config,
        nodes: result.config?.networks.nodes.length,
        edges: result.config?.networks.edges.length,
        containerizedMorphologies: extractWithAlternateMorphologies(
          result.config?.networks.nodes ?? [],
          result.config?.components
        ),
        morphologies: Object.entries(
          extractWithAlternateMorphologies(
            result.config?.networks.nodes ?? [],
            result.config?.components
          )
        ).filter(([, value]) => Boolean(value.alternate_morphologies)).length,
        error: result.error,
      };
    },
  });

  useEffect(() => {
    updateFileCounter({
      nodes: networksConfig.data?.nodes,
      edges: networksConfig.data?.nodes,
      morphologies: networksConfig.data?.nodes,
    });
  }, [
    networksConfig.data?.nodes,
    networksConfig.data?.edges,
    networksConfig.data?.morphologies,
    updateFileCounter,
  ]);

  return match(networksConfig)
    .with({ isLoading: true }, () => (
      <div className="flex flex-col gap-10">
        <SkeletonItem itemsCount={3} />
        <SkeletonItem className="opacity-75" itemsCount={3} />
      </div>
    ))
    .with(
      { data: { error: P.string.select('error') }, error: P.select('catchError') },
      ({ error }) => {
        let err = '';
        if (isString(error)) err = error;
        else if (error?.directory && error?.config)
          err = 'Failed to load networks configuration and directory assets';
        else if (error?.directory) err = error.directory;
        else if (error?.config) err = error.config;
        return (
          <Error icon={null} title="Networks" description={err} cls={{ container: 'text-white' }} />
        );
      }
    )
    .with({ data: { directory: P.nullish, config: P.nonNullable } }, () => (
      <Error
        icon={null}
        title="Networks"
        description="No assets directory was found"
        cls={{ container: 'text-white' }}
      />
    ))
    .with({ data: { directory: P.nonNullable, config: P.nullish } }, () => (
      <Error
        icon={null}
        title="Networks"
        description="No configuration asset was found"
        cls={{ container: 'text-white' }}
      />
    ))
    .with(
      { data: { directory: P.nonNullable, config: P.nonNullable } },
      ({ data: { directory, config } }) => {
        const networks = buildNetworksConfig(config.networks, directory, config.manifest);
        const fullConfig = networksContentConfiguration.map((o) => ({
          ...o,
          ...get(networks, o.key, {}),
        })) as unknown as Record<string, Omit<ConfigItemProps, 'className'>>;
        const containerizedMorphologies = extractWithAlternateMorphologies(
          config.networks.nodes,
          config.components
        );

        const items = compact(
          Object.entries(containerizedMorphologies).map(([key, value]) => {
            const containerized = value.alternate_morphologies;
            if (containerized) {
              const asset = {
                path: getAssetPath(containerized ?? '', config.manifest),
                ...get(directory, getAssetPath(containerized ?? '', config.manifest), {
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
      }
    )
    .otherwise(() => null);
}
