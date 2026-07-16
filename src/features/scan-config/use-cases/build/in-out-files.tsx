import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, includes } from 'es-toolkit/compat';
import { useEffect } from 'react';

import { hasAssets } from '@/api/entitycore/guards';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { CircuitScaleDictionary, type ICircuit } from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  AssetContentType,
  AssetLabel,
  type EntityCoreBaseAsset,
  type IAsset,
} from '@/api/entitycore/types/shared/global';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import {
  getEntityTypeTagLabel,
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import {
  makeLogStreamFileDescriptors,
  makeTaskConfigurationFile,
  makeTaskLogsFile,
  prependLogStreamFile,
} from '@/features/task-logs-stream/descriptor';
import { MAX_VISUALIZATION_ASSET_REFETCH_RETRIES } from '@/features/task-runner';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type TBuildCampaignMeta = { scan_parameters?: Record<string, unknown> };

type BuiltEntity = EntityCoreObjectTypes & Partial<EntityCoreBaseAsset> & { name?: string };

type BuiltEntityWithAssets = BuiltEntity & EntityCoreBaseAsset;

type Props = {
  config: ITaskConfig<TBuildCampaignMeta>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  context: { virtualLabId: string; projectId: string };
  campaignOrigin: TScanConfigCampaignOriginActionDict;
};

/** Build outputs that list individual assets in addition to the entity mini-detail. */
const ENTITY_TYPES_WITH_ASSET_OUTPUTS = new Set<string>([
  EntityTypeDict.SimulatableExtracellularRecordingArray,
]);

function isCircuitType(type: string | null | undefined): boolean {
  return type === EntityTypeDict.Circuit;
}

function shouldListAssetsAsOutputs(type: string | null | undefined): boolean {
  return !!type && ENTITY_TYPES_WITH_ASSET_OUTPUTS.has(type);
}

function findAssetByLabel(assets: readonly IAsset[], label: AssetLabel): IAsset | null {
  return getAsset({ assets, label }).getOneOrNull();
}

function makeEntityMiniDetailFile(entity: BuiltEntityWithAssets): TActivityCustomFile {
  return {
    id: entity.id,
    entity,
    asset: entity.assets[0],
    name: entity.name,
    renderer: ActivityCustomFileRenderer.MiniDetailView,
  };
}

function makeAssetOutputFiles(entity: BuiltEntityWithAssets): TActivityCustomFile[] {
  return entity.assets.map((asset) => ({
    id: asset.id,
    entity,
    asset,
    name: asset.path,
    renderer: ActivityCustomFileRenderer.Default,
  }));
}

function makeBuiltOutputFiles(entity: BuiltEntity | null | undefined): TActivityCustomFile[] {
  if (!entity || !hasAssets(entity) || !entity.assets[0]) return [];

  if (shouldListAssetsAsOutputs(entity.type)) {
    return [makeEntityMiniDetailFile(entity), ...makeAssetOutputFiles(entity)];
  }

  return [makeEntityMiniDetailFile(entity)];
}

function isSingleNeuronCircuit(entity: TActivityCustomFile['entity']): boolean {
  if (!isCircuitType(entity.type) || !('scale' in entity)) return false;
  return (entity as ICircuit).scale === CircuitScaleDictionary.Single;
}

function getOutputEntityLabel(file: TActivityCustomFile): string | null {
  if (file.renderer !== ActivityCustomFileRenderer.MiniDetailView) return null;

  // EM synapse-mapping outputs a single-scale circuit, labeled Synaptome (beta)
  const entityType = isSingleNeuronCircuit(file.entity)
    ? ExtendedEntitiesTypeDict.SingleNeuronCircuit
    : (file.entity.type as TExtendedEntitiesTypeDict);

  return getEntityTypeTagLabel(entityType);
}

function shouldPollForCircuitVisualization(query: {
  state: {
    error: Error | null;
    data: BuiltEntity | undefined;
    dataUpdateCount: number;
  };
}): boolean {
  if (query.state.error) return false;
  if (!hasAssets(query.state.data)) return true;

  const hasVisAsset = !!findAssetByLabel(query.state.data.assets, AssetLabel.circuit_visualization);
  const hasReachedMaxRetries =
    query.state.dataUpdateCount >= MAX_VISUALIZATION_ASSET_REFETCH_RETRIES;

  return !(hasVisAsset || hasReachedMaxRetries);
}

export function InOutFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  context,
  campaignOrigin,
}: Props) {
  const queryClient = useQueryClient();
  const generated = execution?.generated?.[0];
  const generatedId = generated?.id;
  const generatedTypeHint = generated?.type as TExtendedEntitiesTypeDict | undefined;

  const { data: resolvedGeneratedType } = useQuery({
    queryKey: keyBuilder.entity({ id: generatedId ?? '', context }),
    // biome-ignore lint/style/noNonNullAssertion: enabled only when generatedId is present
    queryFn: () => getEntity({ id: generatedId!, context }),
    select: (entity) => entity.type as TExtendedEntitiesTypeDict,
    enabled: !!generatedId && !generatedTypeHint,
  });

  const generatedType = generatedTypeHint ?? resolvedGeneratedType;
  const isCircuitBuild = isCircuitType(generatedType);
  const shouldPollVisualization =
    isCircuitBuild && campaignOrigin !== ScanConfigCampaignOriginActionDict.View;

  const { data: builtEntity, isLoading } = useQuery({
    queryKey: keyBuilder.entity({
      id: generatedId ?? '',
      context,
      type: generatedType,
    }),
    queryFn: () =>
      retrieveEntity({
        // biome-ignore lint/style/noNonNullAssertion: enabled only when both are present
        type: generatedType!,
        // biome-ignore lint/style/noNonNullAssertion: enabled only when both are present
        id: generatedId!,
        ctx: context,
      }) as Promise<BuiltEntity>,
    enabled: !!generatedId && !!generatedType,
    refetchInterval(query) {
      if (!shouldPollVisualization) return false;
      return shouldPollForCircuitVisualization(query) ? 2_000 : false;
    },
  });

  const configAsset = findAssetByLabel(config.assets, AssetLabel.task_config);
  const circuitConfigAsset =
    isCircuitBuild && hasAssets(builtEntity)
      ? findAssetByLabel(builtEntity.assets, AssetLabel.sonata_circuit)
      : null;

  const logStreamFiles = makeLogStreamFileDescriptors({
    configId: config.id,
    executionId: execution?.execution_id,
  });

  const inputFiles: TActivityCustomFile[] = [];
  if (configAsset) {
    inputFiles.push({
      id: configAsset.id,
      entity: config,
      asset: configAsset,
      renderer: ActivityCustomFileRenderer.Default,
    });
  }
  if (builtEntity && circuitConfigAsset) {
    inputFiles.push({
      id: circuitConfigAsset.id,
      entity: builtEntity,
      asset: circuitConfigAsset,
      assetPath: 'circuit_config.json',
      enforcedRenderType: AssetContentType.json,
      renderer: ActivityCustomFileRenderer.Default,
    });
  }
  const inputFilesWithLogs = prependLogStreamFile({
    file: logStreamFiles.input
      ? makeTaskConfigurationFile({ descriptor: logStreamFiles.input, config })
      : null,
    files: inputFiles,
  });

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  const builtOutputFiles = makeBuiltOutputFiles(builtEntity);
  const outputFiles = prependLogStreamFile({
    file:
      logStreamFiles.output && execution
        ? makeTaskLogsFile({ descriptor: logStreamFiles.output, execution })
        : null,
    files: builtOutputFiles,
  });

  useEffect(() => {
    if (!outputAvailable || !builtEntity || !isCircuitBuild) return;

    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === `data-entity-count-${ExtendedEntitiesTypeDict.SingleNeuronCircuit}`,
    });
    queryClient.invalidateQueries({
      predicate: (query) =>
        get(query.queryKey[0], 'context.extendedEntityType') ===
        ExtendedEntitiesTypeDict.SingleNeuronCircuit,
    });
  }, [outputAvailable, builtEntity, isCircuitBuild, queryClient]);

  useAutoSelectFileOnConfigChange({
    configId: config.id,
    selectedFile,
    inputFiles: inputFilesWithLogs,
    outputFiles,
    onSelect,
  });

  return (
    <IoLayout
      showOutput={outputAvailable || logStreamFiles.showOutput}
      inputIsEmpty={inputFilesWithLogs.length === 0}
      outputIsEmpty={builtOutputFiles.length === 0 && !isLoading && !logStreamFiles.output}
      inputItems={inputFilesWithLogs.map((file) => (
        <TaskIOFileItem
          id={file.asset.id}
          selected={file.asset.id === selectedFile?.id}
          key={file.asset?.id}
          file={file}
          onSelect={onSelect}
          name={file.name}
        />
      ))}
      outputItems={outputFiles.map((file) => {
        const label = getOutputEntityLabel(file);
        return (
          <TaskIOFileItem
            id={file.id}
            label={label ? <small className="uppercase">{label}</small> : null}
            selected={file.id === selectedFile?.id}
            key={file.id}
            file={file}
            name={file.name}
            onSelect={onSelect}
          />
        );
      })}
    />
  );
}
