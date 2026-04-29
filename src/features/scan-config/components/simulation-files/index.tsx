import { sortBy } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { useEffect, useMemo } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { simResultBySimIdAtomFamily, useModelQuery } from '@/features/scan-config/components/atoms';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { useLastTruthyValue } from '@/hooks/hooks';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { WorkspaceContext } from '@/types/common';

type SimulationFilesProps = {
  simulation: ISimulation;
  execStatus: ActivityStatus;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  onLoadingChange: (loading: boolean) => void;
  context: WorkspaceContext;
};

export function SimulationFiles({
  simulation,
  execStatus,
  selectedFile,
  onSelect,
  onLoadingChange,
  context,
}: SimulationFilesProps) {
  const [inputLoading, inputFiles] = useInputFiles(simulation, context);

  const outputAvailable =
    !!execStatus && [ActivityStatus.ERROR, ActivityStatus.DONE].includes(execStatus);

  const [outputLoading, outputFiles] = useOutputFiles(simulation, context, outputAvailable);

  const loading = inputLoading || outputLoading;

  const prioritizedInputFiles = useMemo(() => {
    const selectedPath = selectedFile?.asset.path;

    return [...inputFiles].sort((a, b) => {
      const aSelected = a.asset.path === selectedPath;
      const bSelected = b.asset.path === selectedPath;
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const aPreferred = a.asset.label === AssetLabel.sonata_circuit;
      const bPreferred = b.asset.label === AssetLabel.sonata_circuit;
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;

      return 0;
    });
  }, [inputFiles, selectedFile?.asset.path]);

  const prioritizedOutputFiles = useMemo(() => {
    const selectedPath = selectedFile?.asset.path;

    return [...outputFiles].sort((a, b) => {
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
  }, [outputFiles, selectedFile?.asset.path]);

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
      showOutput={outputAvailable}
      inputIsEmpty={inputFiles.length === 0}
      outputIsEmpty={outputFiles.length === 0 && !outputLoading}
      inputItems={inputFiles.map((file) => (
        <TaskIOFileItem
          id={file.asset.id}
          selected={file.asset.path === selectedFile?.asset.path}
          key={file.asset.id}
          file={file}
          onSelect={onSelect}
        />
      ))}
      outputItems={outputFiles.map((file) => (
        <TaskIOFileItem
          id={file.asset.id}
          selected={file.asset.path === selectedFile?.asset.path}
          key={file.asset.id}
          file={file}
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
  const simResultLoadableAtom = useMemo(() => loadable(simResultAtom), [simResultAtom]);
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
