import { sortBy } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { useEffect, useMemo } from 'react';

import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { Loader } from '@/components/loader';
import { simResultBySimIdAtomFamily, useModelQuery } from '@/features/scan-config/components/atoms';
import { ActivityCustomFileRenderer, type TActivityCustomFile } from '@/features/scan-config/types';
import { useLastTruthyValue } from '@/hooks/hooks';
import { classNames } from '@/util/utils';

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

  // Notify parent component about the loading state
  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  /*
    Handle file auto-selection
    - On page load select the voltage report if available, otherwise - circuit config.
    - On simulation change select the file with the same asset path falling back
      to the default selection on page load.
  */
  useEffect(() => {
    if (loading) {
      return;
    }

    const circuitConfigFile = inputFiles.find(
      (file) => file.asset.label === AssetLabel.sonata_circuit
    );

    const voltageReportFile = outputFiles.find(
      (file) =>
        file.asset.label === AssetLabel.voltage_report &&
        file.asset.content_type === AssetContentType.nwb
    );

    if (!selectedFile) {
      if (voltageReportFile) {
        onSelect(voltageReportFile);
        return;
      }

      if (circuitConfigFile) {
        onSelect(circuitConfigFile);
        return;
      }

      return;
    }

    if (selectedFile.asset.label === AssetLabel.sonata_circuit) {
      onSelect(selectedFile);
      return;
    }

    const fileToSelect =
      [...inputFiles, ...outputFiles].find((file) => file.asset.path === selectedFile.asset.path) ??
      voltageReportFile ??
      circuitConfigFile;

    if (fileToSelect) {
      onSelect(fileToSelect);
    }
  }, [loading, inputFiles, outputFiles, onSelect, selectedFile]);

  return (
    <div className="h-full overflow-y-auto">
      <h4 className="uppercase">Input files</h4>
      <div className="mt-4 mb-8 flex flex-col gap-4">
        {inputFiles.map((file) => (
          <SimulationFile
            selected={file.asset.path === selectedFile?.asset.path}
            key={file.asset.id}
            file={file}
            onSelect={onSelect}
          />
        ))}
      </div>
      {outputAvailable && (
        <>
          <h4 className="uppercase">Output files</h4>
          <div className="mt-4 flex flex-col gap-4">
            {outputFiles.map((file) => (
              <SimulationFile
                selected={file.asset.path === selectedFile?.asset.path}
                key={file.asset.id}
                file={file}
                onSelect={onSelect}
              />
            ))}
          </div>
        </>
      )}
      {loading && (
        <div className="absolute inset-0 z-10 flex cursor-progress items-center justify-center rounded-2xl bg-black/4">
          <Loader className="text-neutral-3" />
        </div>
      )}
    </div>
  );
}

function useInputFiles(
  simulation: ISimulation,
  context: WorkspaceContext
): [boolean, TActivityCustomFile[]] {
  const { entity, isLoading } = useModelQuery({ id: simulation.entity_id, context });

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

type SimulationFileProps = {
  file: TActivityCustomFile;
  selected?: boolean;
  onSelect: (file: TActivityCustomFile) => void;
};

function SimulationFile({ file, selected, onSelect }: SimulationFileProps) {
  const fileName = file.assetPath?.split('/').at(-1) ?? file.asset.path.split('/').at(-1);
  const fileExt = fileName?.split('.').at(-1);

  return (
    <button
      type="button"
      title={fileName}
      className={classNames(
        'flex w-full cursor-pointer items-center justify-between rounded-4xl p-4',
        selected ? 'bg-[linear-gradient(95.07deg,#003A8C_42.23%,#001026_109.71%)]' : 'bg-white'
      )}
      onClick={() => onSelect(file)}
    >
      <span
        className={classNames(
          'truncate overflow-hidden font-semibold whitespace-nowrap',
          selected ? 'text-white' : 'text-primary-9'
        )}
      >
        {fileName}
      </span>
      <span
        className={classNames(
          'ml-4 shrink-0 rounded-2xl border px-4 uppercase',
          selected ? 'border-white text-white' : 'text-neutral-5 border-neutral-5'
        )}
      >
        {fileExt}
      </span>
    </button>
  );
}
