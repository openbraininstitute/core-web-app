import { useQuery } from '@tanstack/react-query';
import isString from 'es-toolkit/compat/isString';
import { useSetAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { match, P } from 'ts-pattern';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { NetworkConfigItem } from '@/ui/segments/explore/circuit/elements/download-panel/config-item';
import {
  configurationFileContentConfiguration,
  electricalModelsContentConfiguration,
  idMappingContentConfiguration,
  mechanismsContentConfiguration,
  nodeSetsFileContentConfiguration,
} from '@/ui/segments/explore/circuit/elements/download-panel/content-configuration';
import { DownloadPanelError } from '@/ui/segments/explore/circuit/elements/download-panel/error';
import { FolderConfigGroup } from '@/ui/segments/explore/circuit/elements/download-panel/folder-config-item';
import {
  buildConfigurationFiles,
  buildElectricalModelsEntries,
  buildMechanismsEntry,
  resolveCircuitConfigAndDirectory,
  updateFileCounterAtom,
} from '@/ui/segments/explore/circuit/elements/download-panel/helpers';
import { AssetDefaultPath } from '@/ui/segments/explore/circuit/elements/download-panel/network-morphology-config';
import { SkeletonItem } from '@/ui/segments/explore/circuit/elements/download-panel/skeleton';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type {
  ICircuit,
  ICircuitSonataConfiguration,
} from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';
import type {
  ConfigItemProps,
  TConfigChild,
} from '@/ui/segments/explore/circuit/elements/download-panel/config-item';
import type { ConfigurationFileItem } from '@/ui/segments/explore/circuit/elements/download-panel/helpers';

export default function ComponentsConfig({ circuit }: { circuit: ICircuit }) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();

  const updateFileCounter = useSetAtom(updateFileCounterAtom(circuit.id));
  const configAsset = getAssetElement({
    assets: circuit?.assets,
    filter: (asset) => asset.label === AssetLabel.sonata_circuit,
  });
  const configAssetId = configAsset?.id ?? '';

  const query = useQuery({
    queryKey: keyBuilder.asset({
      entityId: circuit.id,
      assetId: configAssetId,
      assetPath: AssetDefaultPath,
      context: { virtualLabId, projectId },
    }),
    queryFn: () =>
      resolveCircuitConfigAndDirectory<ICircuitSonataConfiguration>({
        entityId: circuit.id,
        assetId: configAssetId,
        assetPath: AssetDefaultPath,
        context: { virtualLabId, projectId },
      }),
    enabled: !!circuit && !!configAssetId,
  });

  const config = query.data?.config ?? null;
  const directory = query.data?.directory ?? null;

  const configurationFiles =
    config && directory ? buildConfigurationFiles(config, directory) : null;
  const electricalEntries =
    config && directory ? buildElectricalModelsEntries(config, directory) : [];
  const mechanismsEntry = config && directory ? buildMechanismsEntry(config, directory) : null;

  const countItem = (item: ConfigurationFileItem | null) => (item?.size ? 1 : 0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable updater
  useEffect(() => {
    updateFileCounter({
      configuration_file: countItem(configurationFiles?.circuitConfig ?? null),
      node_sets_file: countItem(configurationFiles?.nodeSetsFile ?? null),
      id_mapping: countItem(configurationFiles?.idMapping ?? null),
      electrical_models: electricalEntries.reduce((acc, e) => acc + e.fileCount, 0),
      mechanisms: mechanismsEntry?.fileCount ?? 0,
    });
  }, [
    configurationFiles?.circuitConfig.size,
    configurationFiles?.nodeSetsFile?.size,
    configurationFiles?.idMapping?.size,
    electricalEntries.length,
    mechanismsEntry?.fileCount,
    updateFileCounter,
  ]);

  return match(query)
    .with({ isLoading: true }, () => (
      <div className="flex flex-col gap-10">
        <SkeletonItem itemsCount={3} />
        <SkeletonItem className="opacity-75" itemsCount={2} />
      </div>
    ))
    .with(
      { data: { error: P.string.select('error') }, error: P.select('catchError') },
      ({ error }) => {
        let err = '';
        if (isString(error)) err = error;
        else if (error?.directory && error?.config)
          err = 'Failed to load circuit configuration and directory assets';
        else if (error?.directory) err = error.directory;
        else if (error?.config) err = error.config;
        return (
          <DownloadPanelError
            icon={null}
            title="Circuit components"
            description={err}
            cls={{ container: 'text-white' }}
          />
        );
      }
    )
    .with({ data: { directory: P.nonNullable, config: P.nonNullable } }, () => {
      const toConfigItem = (f: ConfigurationFileItem): TConfigChild => {
        const filename = f.path.split('/').pop() || f.path;
        const hasDirectory = filename !== f.path;
        return {
          asset: { path: f.path, name: filename, size: f.size, last_modified: null },
          title: filename,
          mimeType: f.path.split('.').pop() ?? 'json',
          description: hasDirectory ? f.path : null,
        };
      };

      const fileSections: Array<{
        contentConfiguration: Pick<ConfigItemProps, 'key' | 'name' | 'description' | 'mimeType'>;
        item: ConfigurationFileItem | null;
      }> = [
        {
          contentConfiguration: configurationFileContentConfiguration,
          item: configurationFiles?.circuitConfig ?? null,
        },
        {
          contentConfiguration: nodeSetsFileContentConfiguration,
          item: configurationFiles?.nodeSetsFile ?? null,
        },
        {
          contentConfiguration: idMappingContentConfiguration,
          item: configurationFiles?.idMapping ?? null,
        },
      ];

      return (
        <>
          {fileSections.map(({ contentConfiguration, item }) =>
            item ? (
              <NetworkConfigItem
                key={contentConfiguration.key}
                name={contentConfiguration.name}
                description={contentConfiguration.description}
                count={item.size ? 1 : 0}
                mimeType={contentConfiguration.mimeType}
                items={[toConfigItem(item)]}
                showType={null}
                showPrefix={null}
                forceDownload
                downloadConfig={{
                  entityId: circuit.id,
                  assetConfigId: configAsset?.id,
                  context: { virtualLabId, projectId },
                }}
              />
            ) : null
          )}
          <FolderConfigGroup
            name={electricalModelsContentConfiguration.name}
            description={electricalModelsContentConfiguration.description}
            mimeType={electricalModelsContentConfiguration.mimeType}
            entries={electricalEntries}
            archiveBaseName={(e) => e.label || 'electrical-models'}
            emptyMessage="No electrical models in this circuit."
            downloadConfig={{
              entityId: circuit.id,
              assetConfigId: configAssetId,
              context: { virtualLabId, projectId },
            }}
          />
          <FolderConfigGroup
            name={mechanismsContentConfiguration.name}
            description={mechanismsContentConfiguration.description}
            mimeType={mechanismsContentConfiguration.mimeType}
            entries={mechanismsEntry ? [mechanismsEntry] : []}
            archiveBaseName={() => 'mechanisms'}
            emptyMessage="No mechanisms in this circuit."
            downloadConfig={{
              entityId: circuit.id,
              assetConfigId: configAssetId,
              context: { virtualLabId, projectId },
            }}
          />
        </>
      );
    })
    .otherwise(() => null);
}
