import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get, includes } from 'es-toolkit/compat';
import { useEffect, useMemo } from 'react';

import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ActivityStatus, type TActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel, type IAsset } from '@/api/entitycore/types/shared/global';
import { useModelQuery } from '@/features/scan-config/components/atoms';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import {
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

import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { TEmSynapseMappingCampaignMeta } from '@/entity-configuration/domain/model/em-synapse-mapping-campaign';

type Props = {
  config: ITaskConfig<TEmSynapseMappingCampaignMeta>;
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
  const queryClient = useQueryClient();
  const { entity: circuit } = useModelQuery({ id: execution?.generated.at(0)?.id, context });
  const configAsset = config.assets.find((o) => o.label === AssetLabel.task_config);
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
    if (configAsset) {
      files.push({
        id: configAsset.id,
        entity: config,
        asset: configAsset,
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
  }, [config, circuit, configAsset, circuitConfigAsset, logStreamFiles.input]);

  const outputAvailable =
    !!execStatus && includes([ActivityStatus.ERROR, ActivityStatus.DONE], execStatus);

  const builtCircuitId = execution?.generated?.[0]?.id;
  const { data: builtCircuit, isLoading } = useQuery({
    queryKey: keyBuilder.oneCircuit({
      virtualLabId: context.virtualLabId,
      projectId: context.projectId,
      entityId: builtCircuitId ?? '',
    }),
    // biome-ignore lint/style/noNonNullAssertion: the function is enabled only when builtCircuitId is present
    queryFn: () => getCircuit({ id: builtCircuitId!, context }),
    enabled: !!builtCircuitId,
    refetchInterval(query) {
      if (campaignOrigin === ScanConfigCampaignOriginActionDict.View) return false;

      const data = query.state.data;
      const hasVisAsset = data?.assets?.some(
        (asset) => asset.label === AssetLabel.circuit_visualization
      );
      const hasReachedMaxRetries =
        query.state.dataUpdateCount >= MAX_VISUALIZATION_ASSET_REFETCH_RETRIES;
      return hasVisAsset || hasReachedMaxRetries ? false : 2_000;
    },
  });

  const outputFiles: TActivityCustomFile[] = useMemo(() => {
    const files: TActivityCustomFile[] = [];
    if (builtCircuit) {
      files.push({
        id: builtCircuit.id,
        entity: builtCircuit,
        asset: builtCircuit.assets[0],
        name: builtCircuit.name,
        renderer: ActivityCustomFileRenderer.MiniDetailView,
      });
    }
    return prependLogStreamFile({
      file:
        logStreamFiles.output && execution
          ? makeTaskLogsFile({ descriptor: logStreamFiles.output, execution })
          : null,
      files,
    });
  }, [builtCircuit, execution, logStreamFiles.output]);

  useEffect(() => {
    if (!outputAvailable || !builtCircuit) return;

    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === `data-entity-count-${ExtendedEntitiesTypeDict.MEModelWithSynapses}`,
    });
    queryClient.invalidateQueries({
      predicate: (query) =>
        get(query.queryKey[0], 'context.extendedEntityType') ===
        ExtendedEntitiesTypeDict.MEModelWithSynapses,
    });
  }, [outputAvailable, builtCircuit, queryClient]);

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
      outputIsEmpty={!builtCircuit && !isLoading && !logStreamFiles.output}
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
        const isBuiltCircuit = file.renderer === ActivityCustomFileRenderer.MiniDetailView;
        return (
          <TaskIOFileItem
            id={file.id}
            label={
              isBuiltCircuit ? (
                <small className="uppercase">
                  Synaptome <span className="lowercase">(beta)</span>
                </small>
              ) : null
            }
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
