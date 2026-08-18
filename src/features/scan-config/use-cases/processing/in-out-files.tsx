import { includes } from 'es-toolkit/compat';
import { useMemo } from 'react';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
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

type TProcessingCampaignMeta = { scan_parameters?: Record<string, unknown> };

type Props = {
  config: ITaskConfig<TProcessingCampaignMeta>;
  execStatus?: TActivityStatus;
  execution?: ITaskActivity;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  context: { virtualLabId: string; projectId: string };
  campaignOrigin: TScanConfigCampaignOriginActionDict;
};

function findCircuitSonataInput(
  files: TActivityCustomFile[]
): { entity: TActivityCustomFile['entity']; asset: IAsset } | null {
  const circuitFile = files.find((file) => file.entity.type === EntityTypeDict.Circuit);
  const entity = circuitFile?.entity;
  if (!entity || !('assets' in entity) || !Array.isArray(entity.assets)) return null;

  const asset = entity.assets.find((item) => item.label === AssetLabel.sonata_circuit);
  if (!asset) return null;

  return { entity, asset };
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
  const logStreamFiles = useMemo(
    () =>
      makeLogStreamFileDescriptors({
        configId: config.id,
        executionId: execution?.execution_id,
      }),
    [config.id, execution?.execution_id]
  );

  const { files: generatedFiles, isLoading } = useGeneratedOutputs({
    execution,
    context,
    pollingEnabled: campaignOrigin !== ScanConfigCampaignOriginActionDict.View,
  });

  const inputFiles: TActivityCustomFile[] = useMemo(() => {
    const files: TActivityCustomFile[] = config.assets.map((asset) => ({
      id: asset.id,
      entity: config,
      asset,
      renderer: ActivityCustomFileRenderer.Default,
    }));

    const circuitSonata = findCircuitSonataInput(generatedFiles);
    if (circuitSonata) {
      files.push({
        id: circuitSonata.asset.id,
        entity: circuitSonata.entity,
        asset: circuitSonata.asset,
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
  }, [config, generatedFiles, logStreamFiles.input]);

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

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
          id={file.id ?? file.asset.id}
          selected={
            file.id ? file.id === selectedFile?.id : file.asset.id === selectedFile?.asset.id
          }
          key={file.id ?? file.asset.id}
          file={file}
          onSelect={onSelect}
          name={file.name}
        />
      ))}
      outputItems={outputFiles.map((file) => {
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
