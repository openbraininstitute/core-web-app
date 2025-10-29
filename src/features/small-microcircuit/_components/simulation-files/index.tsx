import { useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';
import sortBy from 'es-toolkit/compat/sortBy';

import { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import { CircuitSimulationExecutionStatus } from '@/api/entitycore/types/entities/circuit-simulation-execution';
import { IEntity } from '@/api/entitycore/types/entities/entity';
import { AssetLabel, IAsset } from '@/api/entitycore/types/shared/global';
import {
  circuitAtomFamily,
  simResultBySimIdAtomFamily,
} from '@/features/small-microcircuit/_components/atoms';
import { WorkspaceContext } from '@/types/common';
import { classNames } from '@/util/utils';
import { useLastTruthyValue } from '@/hooks/hooks';
import { loadable } from 'jotai/utils';
import Loader from '@/components/loader';

export type File = {
  asset: IAsset;
  entity: IEntity;
  assetPath?: string;
};

type SimulationFilesProps = {
  simulation: ICircuitSimulation;
  execStatus?: CircuitSimulationExecutionStatus | null;
  selectedFile?: File;
  onSelect: (file: File) => void;
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
    !!execStatus &&
    [CircuitSimulationExecutionStatus.ERROR, CircuitSimulationExecutionStatus.DONE].includes(
      execStatus
    );

  const [outputLoading, outputFiles] = useOutputFiles(simulation, context, outputAvailable);

  const loading = inputLoading || outputLoading;

  // Notify parent component about the loading state
  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  /*
    Handle file auto-selection
    - On page load select the circuit config
    - On simulation change select the file with the same asset path,
      if not available - circuit config
  */
  useEffect(() => {
    if (loading) {
      return;
    }

    if (!selectedFile) {
      const circuitConfigFile = inputFiles.find(
        (file) => file.asset.label === AssetLabel.sonata_circuit
      );
      if (circuitConfigFile) {
        onSelect(circuitConfigFile);
      }
      return;
    }

    const fileToSelect = [...inputFiles, ...outputFiles].find(
      (file) => file.asset.path === selectedFile.asset.path
    );

    if (fileToSelect && fileToSelect !== selectedFile) {
      onSelect(fileToSelect);
    }
  }, [loading, inputFiles, outputFiles, onSelect, selectedFile]);

  return (
    <>
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
      {loading && (
        <div className="absolute inset-0 z-10 flex cursor-progress items-center justify-center rounded-2xl bg-black/4">
          <Loader className="text-neutral-3" />
        </div>
      )}
    </>
  );
}

type SimulationInputFilesProps = {
  simulation: ICircuitSimulation;
  context: WorkspaceContext;
  selectedFile?: File;
  onSelect: (file: File) => void;
  className?: string;
};

function useInputFiles(
  simulation: ICircuitSimulation,
  context: WorkspaceContext
): [boolean, File[]] {
  const circuitAtom = circuitAtomFamily({ circuitId: simulation.entity_id, context });
  const circuitLoadableAtom = useMemo(() => loadable(circuitAtom), [circuitAtom]);

  const circuitLoadable = useAtomValue(circuitLoadableAtom);
  const loading = circuitLoadable.state === 'loading';

  const lastCircuit = useLastTruthyValue(circuitAtom);

  const circuit = circuitLoadable.state === 'hasData' ? circuitLoadable.data : lastCircuit;

  const files: File[] = useMemo(() => {
    const sonataCircuitAsset = circuit?.assets.find(
      (asset) => asset.label === AssetLabel.sonata_circuit
    );

    const files: File[] = [];

    if (circuit && sonataCircuitAsset) {
      files.push({
        entity: circuit,
        asset: sonataCircuitAsset,
        assetPath: 'circuit_config.json',
      });
    }

    sortBy(
      simulation.assets.map((asset) => ({ asset, entity: simulation })),
      (file) => file.asset.path
    ).forEach((file) => files.push(file));

    return files;
  }, [circuit, simulation]);

  return [loading, files];
}

function useOutputFiles(
  simulation: ICircuitSimulation,
  context: WorkspaceContext,
  enabled: boolean
): [boolean, File[]] {
  const simResultAtom = simResultBySimIdAtomFamily({
    simulationId: simulation.id,
    context,
    enabled,
  });
  const simResultLoadableAtom = useMemo(() => loadable(simResultAtom), [simResultAtom]);

  const simResult = useLastTruthyValue(simResultAtom);

  const simResultLoadable = useAtomValue(simResultLoadableAtom);
  const loading = simResultLoadable.state === 'loading';

  const files: File[] = useMemo(
    () =>
      simResult
        ? sortBy(
            simResult.assets.map((asset) => ({ asset, entity: simResult })),
            (file) => file.asset.path
          )
        : [],
    [simResult]
  );

  return [loading, files];
}

function SimulationInputFiles({
  simulation,
  context,
  selectedFile,
  onSelect,
  className = '',
}: SimulationInputFilesProps) {
  const [loading, files] = useInputFiles(simulation, context);

  return (
    <div className={classNames('flex flex-col gap-4', className)}>
      {files.map((file) => (
        <SimulationFile
          selected={file.asset.id === selectedFile?.asset.id}
          key={file.asset.id}
          file={file}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

type SimulationOutputFilesProps = {
  simulation: ICircuitSimulation;
  context: WorkspaceContext;
  selectedFile?: File;
  onSelect: (file: File) => void;
  className?: string;
  outputAvailable?: boolean;
};

function SimulationOutputFiles({
  simulation,
  onSelect,
  selectedFile,
  context,
  className = '',
  outputAvailable = false,
}: SimulationOutputFilesProps) {
  const [loading, files] = useOutputFiles(simulation, context, outputAvailable);

  return (
    <div className={classNames('flex flex-col gap-4', className)}>
      {files.map((file) => (
        <SimulationFile
          key={file.asset.id}
          file={file}
          selected={selectedFile?.asset.id === file.asset.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

type SimulationFileProps = {
  file: File;
  selected?: boolean;
  onSelect: (file: File) => void;
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
        selected ? 'bg-[linear-gradient(95.07deg,_#003A8C_42.23%,_#001026_109.71%)]' : 'bg-white'
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
          'ml-4 flex-shrink-0 rounded-2xl border-1 px-4 uppercase',
          selected ? 'border-white text-white' : 'text-neutral-5 border-neutral-5'
        )}
      >
        {fileExt}
      </span>
    </button>
  );
}
