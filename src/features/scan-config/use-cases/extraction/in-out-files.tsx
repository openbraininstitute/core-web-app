import { includes } from 'es-toolkit/compat';
import { useMemo } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import { useModelQuery } from '@/features/scan-config/components/atoms';
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
import {
  makeLogStreamFileDescriptors,
  makeTaskConfigurationFile,
  makeTaskLogsFile,
  prependLogStreamFile,
} from '@/features/task-logs-stream/descriptor';

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TTaskConfigMeta } from '@/entity-configuration/domain/extraction/extraction-campaign';

type Props = {
  config: ITaskConfig<TTaskConfigMeta>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  context: { virtualLabId: string; projectId: string };
  campaignOrigin: TScanConfigCampaignOriginActionDict;
};

export function InOutFiles({
  config,
  execStatus,
  execution,
  selectedFile,
  onSelect,
  context,
  campaignOrigin,
}: Props) {
  // the sonata config below is a circuit asset, so this only resolves when a circuit is what the
  // run generated — asking the circuit endpoint for another shape's id just 404s
  const generatedRef = execution?.generated?.at(0);
  const generatedCircuitId =
    generatedRef?.type === EntityTypeDict.Circuit ? generatedRef.id : undefined;
  const { entity: circuit } = useModelQuery({ id: generatedCircuitId, context });
  const extractionConfigAsset = config.assets.find((o) => o.label === AssetLabel.task_config);
  const circuitAssets = circuit && 'assets' in circuit ? circuit.assets : [];
  const circuitConfigAsset = circuitAssets?.find(
    (o: IAsset) => o.label === AssetLabel.sonata_circuit
  );
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
    if (extractionConfigAsset) {
      files.push({
        id: extractionConfigAsset.id,
        entity: config,
        asset: extractionConfigAsset,
        renderer: ActivityCustomFileRenderer.Default,
      });
    }
    if (circuit && circuitConfigAsset) {
      files.push({
        id: circuitConfigAsset.id,
        entity: circuit,
        asset: circuitConfigAsset,
        assetPath: 'circuit_config.json',
        enforcedRenderType: AssetContentType.json,
        renderer: ActivityCustomFileRenderer.Default,
      });
    }
    return prependLogStreamFile({
      file: logStreamFiles.input
        ? makeTaskConfigurationFile({ descriptor: logStreamFiles.input, config })
        : null,
      files,
    });
  }, [config, circuit, extractionConfigAsset, circuitConfigAsset, logStreamFiles.input]);

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  // whatever the run generated — a circuit, a task result holding several assets — resolved by the
  // strategy that claims each ref rather than assumed to be a circuit
  const { files: generatedFiles, isLoading } = useGeneratedOutputs({
    execution,
    context,
    pollingEnabled: campaignOrigin !== ScanConfigCampaignOriginActionDict.View,
  });

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
        // the label names whatever the run generated, which is no longer always a circuit
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
