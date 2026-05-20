import { sortBy } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { simResultBySimIdAtomFamily, useModelQuery } from '@/features/scan-config/components/atoms';
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
import { useLastTruthyValue } from '@/hooks/hooks';
import { createLoadableAtom } from '@/utils/jotai-loadable';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { WorkspaceContext } from '@/types/common';

type SimulationFilesProps = {
  simulation: ISimulation;
  execStatus: ActivityStatus;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  onLoadingChange: (loading: boolean) => void;
  context: WorkspaceContext;
  jobId?: string;
};

export function SimulationFiles({
  simulation,
  execStatus,
  selectedFile,
  onSelect,
  onLoadingChange,
  context,
  jobId,
}: SimulationFilesProps) {
  const [inputLoading, inputFiles] = useInputFiles(simulation, context);

  const outputAvailable =
    !!execStatus && [ActivityStatus.ERROR, ActivityStatus.DONE].includes(execStatus);

  const [outputLoading, outputFiles] = useOutputFiles(simulation, context, outputAvailable);

  const logStreamFiles = useMemo(
    () =>
      makeLogStreamFileDescriptors({
        configId: simulation.id,
        executionId: jobId,
      }),
    [simulation.id, jobId]
  );

  const inputFilesWithLogs = useMemo(() => {
    return prependLogStreamFile({
      file: logStreamFiles.input
        ? makeTaskConfigurationFile({
            descriptor: logStreamFiles.input,
            config: simulation as unknown as ITaskConfig<Record<string, unknown>>,
          })
        : null,
      files: inputFiles,
    });
  }, [inputFiles, logStreamFiles.input, simulation]);

  const outputFilesWithLogs = useMemo(() => {
    return prependLogStreamFile({
      file:
        logStreamFiles.output && jobId
          ? makeTaskLogsFile({
              descriptor: logStreamFiles.output,
              execution: { execution_id: jobId } as ITaskActivity,
            })
          : null,
      files: outputFiles,
    });
  }, [outputFiles, logStreamFiles.output, jobId]);

  const loading = inputLoading || outputLoading;

  const prioritizedInputFiles = useMemo(() => {
    const selectedPath = selectedFile?.asset.path;

    return [...inputFilesWithLogs].sort((a, b) => {
      const aSelected = a.asset.path === selectedPath;
      const bSelected = b.asset.path === selectedPath;
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const aPreferred = a.asset.label === AssetLabel.sonata_circuit;
      const bPreferred = b.asset.label === AssetLabel.sonata_circuit;
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;

      return 0;
    });
  }, [inputFilesWithLogs, selectedFile?.asset.path]);

  const prioritizedOutputFiles = useMemo(() => {
    const selectedPath = selectedFile?.asset.path;

    return [...outputFilesWithLogs].sort((a, b) => {
      const aSelected = a.asset.path === selectedPath;
      const bSelected = b.asset.path === selectedPath;
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const aPreferred =
        a.asset.label === AssetLabel.voltage_report &&
        a.asset.content_type === AssetContentType.nwb;
      const bPreferred =
        b.asset.label === AssetLabel.voltage_report &&
        b.asset.content_type === AssetContentType.nwb;
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;

      return 0;
    });
  }, [outputFilesWithLogs, selectedFile?.asset.path]);

  // Notify parent component about the loading state
  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  useAutoSelectFileOnConfigChange({
    configId: simulation.id,
    selectedFile,
    inputFiles: prioritizedInputFiles,
    outputFiles: prioritizedOutputFiles,
    onSelect,
  });

  return (
    <IoLayout
      inputTitle="Input files"
      outputTitle="Output files"
      showOutput={outputAvailable || logStreamFiles.showOutput}
      inputIsEmpty={inputFilesWithLogs.length === 0}
      outputIsEmpty={outputFilesWithLogs.length === 0 && !outputLoading}
      inputItems={inputFilesWithLogs.map((file) => (
        <TaskIOFileItem
          id={file.id ?? file.asset.id}
          selected={
            file.id ? file.id === selectedFile?.id : file.asset.path === selectedFile?.asset.path
          }
          key={file.id ?? file.asset.id}
          file={file}
          name={file.name}
          onSelect={onSelect}
        />
      ))}
      outputItems={outputFilesWithLogs.map((file) => (
        <TaskIOFileItem
          id={file.id ?? file.asset.id}
          selected={
            file.id ? file.id === selectedFile?.id : file.asset.path === selectedFile?.asset.path
          }
          key={file.id ?? file.asset.id}
          file={file}
          name={file.name}
          onSelect={onSelect}
        />
      ))}
    />
  );
}

function useInputFiles(
  simulation: ISimulation,
  context: WorkspaceContext
): [boolean, TActivityCustomFile[]] {
  const { entity, isLoading } = useModelQuery({
    id: simulation.entity_id,
    context,
  });

  const inputFiles: TActivityCustomFile[] = useMemo(() => {
    const sonataCircuitAsset =
      entity && 'assets' in entity
        ? entity.assets?.find((asset) => asset.label === AssetLabel.sonata_circuit)
        : null;

    const files: TActivityCustomFile[] = [];

    if (entity && sonataCircuitAsset) {
      files.push({
        entity,
        asset: sonataCircuitAsset,
        assetPath: 'circuit_config.json',
        enforcedRenderType: AssetContentType.json,
        renderer: ActivityCustomFileRenderer.Default,
      });
    }

    sortBy(
      simulation.assets.map((asset) => ({ asset, entity: simulation })),
      (file) => file.asset.path
    ).forEach((file) => {
      files.push({ ...file, renderer: ActivityCustomFileRenderer.Default });
    });

    return files;
  }, [entity, simulation]);

  return [isLoading, inputFiles];
}

function useOutputFiles(
  simulation: ISimulation,
  context: WorkspaceContext,
  enabled: boolean
): [boolean, TActivityCustomFile[]] {
  const simResultAtom = simResultBySimIdAtomFamily({
    simulationId: simulation.id,
    context,
    enabled,
  });
  const simResultLoadableAtom = useMemo(() => createLoadableAtom(simResultAtom), [simResultAtom]);
  const simResult = useLastTruthyValue(simResultAtom);
  const simResultLoadable = useAtomValue(simResultLoadableAtom);

  return useMemo(() => {
    const loading = simResultLoadable.state === 'loading';
    const hasData = simResultLoadable.state === 'hasData';

    const simResultEntity = hasData ? simResultLoadable.data : simResult;

    const assets = simResultEntity?.assets ?? [];

    if (!simResultEntity) return [loading, []];

    const files = sortBy(
      assets.map((asset) => ({
        asset,
        entity: simResultEntity,
        renderer: ActivityCustomFileRenderer.Default,
      })),
      (file) => file.asset.path
    );

    return [loading, files];
  }, [simResult, simResultLoadable]);
}
