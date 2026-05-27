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
  configurationFilesContentConfiguration,
  electricalModelsContentConfiguration,
  mechanismsContentConfiguration,
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
import type { TConfigChild } from '@/ui/segments/explore/circuit/elements/download-panel/config-item';

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

  const configurationFiles = config && directory ? buildConfigurationFiles(config, directory) : [];
  const electricalEntries =
    config && directory ? buildElectricalModelsEntries(config, directory) : [];
  const mechanismsEntry = config && directory ? buildMechanismsEntry(config, directory) : null;

  // biome-ignore lint/correctness/useExhaustiveDependencies: stable updater
  useEffect(() => {
    updateFileCounter({
      configuration_files: configurationFiles.filter((f) => f.size).length,
      electrical_models: electricalEntries.reduce((acc, e) => acc + e.fileCount, 0),
      mechanisms: mechanismsEntry?.fileCount ?? 0,
    });
  }, [
    configurationFiles.length,
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
      const configItems: TConfigChild[] = configurationFiles.map((f) => ({
        asset: { path: f.path, name: f.title, size: f.size, last_modified: null },
        title: f.title,
        mimeType: f.path.split('.').pop() ?? 'json',
        description: f.path,
      }));

      return (
        <>
          <NetworkConfigItem
            key="configuration_files"
            name={configurationFilesContentConfiguration.name}
            description={configurationFilesContentConfiguration.description}
            count={configItems.filter((i) => i.asset?.size).length}
            mimeType={configurationFilesContentConfiguration.mimeType}
            items={configItems}
            showType={null}
            showPrefix={null}
            forceDownload
            downloadConfig={{
              entityId: circuit.id,
              assetConfigId: configAsset?.id,
              context: { virtualLabId, projectId },
            }}
          />
          <FolderConfigGroup
            name={electricalModelsContentConfiguration.name}
            description={electricalModelsContentConfiguration.description}
            mimeType={electricalModelsContentConfiguration.mimeType}
            entries={electricalEntries}
            archiveBaseName={(e) => e.label || 'electrical-models'}
            emptyMessage="No electrical models directory in this circuit."
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
            emptyMessage="No mechanisms directory in this circuit."
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
