import { useQuery } from '@tanstack/react-query';
import { includes } from 'es-toolkit/compat';

import { hasAssets } from '@/api/entitycore/guards';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getAsset } from '@/api/entitycore/selectors/assets';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import {
  AssetLabel,
  type EntityCoreBaseAsset,
  type IAsset,
} from '@/api/entitycore/types/shared/global';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import {
  makeLogStreamFileDescriptors,
  makeTaskConfigurationFile,
  makeTaskLogsFile,
  prependLogStreamFile,
} from '@/features/task-logs-stream/descriptor';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/optimization/emodel-optimization-campaign';
import type { TScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';

type OptimizedEntity = EntityCoreObjectTypes & Partial<EntityCoreBaseAsset> & { name?: string };
type OptimizedEntityWithAssets = OptimizedEntity & EntityCoreBaseAsset;

type Props = {
  config: ITaskConfig<TTaskConfigMeta>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  context: { virtualLabId: string; projectId: string };
  campaignOrigin: TScanConfigCampaignOriginActionDict;
};

function findAssetByLabel(assets: readonly IAsset[], label: AssetLabel): IAsset | null {
  return getAsset({ assets, label }).getOneOrNull();
}

/** The optimized e-model output shown as a mini-detail entry. */
function makeOptimizedOutputFiles(
  entity: OptimizedEntity | null | undefined
): TActivityCustomFile[] {
  if (!entity || !hasAssets(entity) || !entity.assets[0]) return [];
  const withAssets = entity as OptimizedEntityWithAssets;
  return [
    {
      id: withAssets.id,
      entity: withAssets,
      asset: withAssets.assets[0],
      name: withAssets.name,
      renderer: ActivityCustomFileRenderer.MiniDetailView,
    },
  ];
}

/**
 * Input/output file listing for one optimization config execution.
 *
 * Inputs: the task configuration (+ live config log stream). Outputs: the optimized e-model entity
 * mini-detail (+ live execution logs). Unlike the build variant there is no circuit-visualization
 * polling — the optimized entity is fetched once its execution reports it.
 */
export function InOutFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  context,
}: Props) {
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

  const { data: optimizedEntity, isLoading } = useQuery({
    queryKey: keyBuilder.entity({ id: generatedId ?? '', context, type: generatedType }),
    queryFn: () =>
      retrieveEntity({
        // biome-ignore lint/style/noNonNullAssertion: enabled only when both are present
        type: generatedType!,
        // biome-ignore lint/style/noNonNullAssertion: enabled only when both are present
        id: generatedId!,
        ctx: context,
      }) as Promise<OptimizedEntity>,
    enabled: !!generatedId && !!generatedType,
  });

  const configAsset = findAssetByLabel(config.assets, AssetLabel.task_config);

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
  const inputFilesWithLogs = prependLogStreamFile({
    file: logStreamFiles.input
      ? makeTaskConfigurationFile({ descriptor: logStreamFiles.input, config })
      : null,
    files: inputFiles,
  });

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  const optimizedOutputFiles = makeOptimizedOutputFiles(optimizedEntity);
  const outputFiles = prependLogStreamFile({
    file:
      logStreamFiles.output && execution
        ? makeTaskLogsFile({ descriptor: logStreamFiles.output, execution })
        : null,
    files: optimizedOutputFiles,
  });

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
      outputIsEmpty={optimizedOutputFiles.length === 0 && !isLoading && !logStreamFiles.output}
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
      outputItems={outputFiles.map((file) => (
        <TaskIOFileItem
          id={file.id}
          selected={file.id === selectedFile?.id}
          key={file.id}
          file={file}
          name={file.name}
          onSelect={onSelect}
        />
      ))}
    />
  );
}
