import { includes } from 'es-toolkit/compat';
import { useMemo } from 'react';

import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import {
  getEntityTypeTagLabel,
  ScanConfigCampaignOriginActionDict,
  type TScanConfigCampaignOriginActionDict,
} from '@/features/scan-config/helpers';
import { useGeneratedOutputs } from '@/features/scan-config/outputs/use-generated-outputs';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { arrangeOptimizationOutputFiles } from '@/features/scan-config/use-cases/optimization/output-files';
import {
  makeLogStreamFileDescriptors,
  makeTaskConfigurationFile,
  makeTaskLogsFile,
  prependLogStreamFile,
} from '@/features/task-logs-stream/descriptor';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/optimization/emodel-optimization-campaign';

type Props = {
  config: ITaskConfig<TTaskConfigMeta>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  context: { virtualLabId: string; projectId: string };
  campaignOrigin: TScanConfigCampaignOriginActionDict;
};

/**
 * Input/output file listing for one optimization config execution.
 *
 * Inputs: the task configuration (+ live config log stream). Outputs: the live execution logs, then
 * what the run generated, arranged by {@link arrangeOptimizationOutputFiles}. A successful run
 * registers a task result (analysis summary, figures directory and checkpoint), a draft e-model and
 * a draft me-model; the models open in their mini-detail view and the result's files in the file
 * viewer.
 */
export function InOutFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  context,
  campaignOrigin,
}: Props) {
  const configAsset = config.assets.find((asset) => asset.label === AssetLabel.task_config);

  const logStreamFiles = useMemo(
    () =>
      makeLogStreamFileDescriptors({
        configId: config.id,
        executionId: execution?.execution_id,
      }),
    [config.id, execution?.execution_id]
  );

  const inputFiles: TActivityCustomFile[] = useMemo(() => {
    const files: TActivityCustomFile[] = [];
    if (configAsset) {
      files.push({
        id: configAsset.id,
        entity: config,
        asset: configAsset,
        renderer: ActivityCustomFileRenderer.Default,
      });
    }
    return prependLogStreamFile({
      file: logStreamFiles.input
        ? makeTaskConfigurationFile({ descriptor: logStreamFiles.input, config })
        : null,
      files,
    });
  }, [config, configAsset, logStreamFiles.input]);

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  const { files: resolvedFiles, isLoading } = useGeneratedOutputs({
    execution,
    context,
    pollingEnabled: campaignOrigin !== ScanConfigCampaignOriginActionDict.View,
  });
  const generatedFiles = useMemo(
    () => arrangeOptimizationOutputFiles(resolvedFiles),
    [resolvedFiles]
  );

  const outputFiles: TActivityCustomFile[] = useMemo(
    () =>
      prependLogStreamFile({
        file:
          logStreamFiles.output && execution
            ? makeTaskLogsFile({ descriptor: logStreamFiles.output, execution })
            : null,
        files: generatedFiles,
      }),
    [generatedFiles, execution, logStreamFiles.output]
  );

  useAutoSelectFileOnConfigChange({
    configId: config.id,
    selectedFile,
    inputFiles,
    outputFiles,
    onSelect,
  });

  return (
    <IoLayout
      showOutput={outputAvailable || logStreamFiles.showOutput}
      inputIsEmpty={inputFiles.length === 0}
      outputIsEmpty={generatedFiles.length === 0 && !isLoading && !logStreamFiles.output}
      inputItems={inputFiles.map((file) => (
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
        // the draft e-model and me-model rows are told apart by their entity type
        const entityLabel =
          file.renderer === ActivityCustomFileRenderer.MiniDetailView
            ? getEntityTypeTagLabel(file.entity.type as TExtendedEntitiesTypeDict)
            : null;
        return (
          <TaskIOFileItem
            id={file.id}
            label={entityLabel ? <small className="uppercase">{entityLabel}</small> : undefined}
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
