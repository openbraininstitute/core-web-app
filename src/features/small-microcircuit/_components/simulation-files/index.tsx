import { useAtomValue } from 'jotai';
import { Suspense, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
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
  context: WorkspaceContext;
};

export function SimulationFiles({
  simulation,
  execStatus,
  selectedFile,
  onSelect,
  context,
}: SimulationFilesProps) {
  const outputAvailable =
    execStatus &&
    [CircuitSimulationExecutionStatus.ERROR, CircuitSimulationExecutionStatus.DONE].includes(
      execStatus
    );

  return (
    <>
      <h4 className="uppercase">Input files</h4>
      <SimulationInputFiles
        className="mt-4 mb-8"
        simulation={simulation}
        context={context}
        selectedFile={selectedFile}
        onSelect={onSelect}
      />
      <h4 className="uppercase">Output files</h4>
      <Suspense fallback={<div className="mt-8 ml-4">Loading...</div>}>
        {outputAvailable && (
          <ErrorBoundary
            fallback={
              <small className="text-error pl-4">There was an issue loading output files</small>
            }
            resetKeys={[simulation]}
          >
            <SimulationOutputFiles
              className="mt-4"
              simulation={simulation}
              context={context}
              selectedFile={selectedFile}
              onSelect={onSelect}
            />
          </ErrorBoundary>
        )}
      </Suspense>
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

function SimulationInputFiles({
  simulation,
  context,
  selectedFile,
  onSelect,
  className = '',
}: SimulationInputFilesProps) {
  const circuit = useAtomValue(circuitAtomFamily({ circuitId: simulation.entity_id, context }));
  // TODO: fetch circuitConfig
  const sonataCircuitAsset = circuit.assets.find(
    (asset) => asset.label === AssetLabel.sonata_circuit
  );
  const circuitConfigFile: File = useMemo(
    () => ({
      entity: circuit,
      asset: sonataCircuitAsset!,
      assetPath: 'circuit_config.json',
    }),
    [circuit, sonataCircuitAsset]
  );

  const files: File[] = useMemo(
    () => [
      circuitConfigFile, // Circuit config has a custom name here and stays in the of the list
      ...sortBy(
        simulation.assets.map((asset) => ({ asset, entity: simulation })),
        (file) => file.asset.path
      ),
    ],
    [simulation, circuitConfigFile]
  );

  return (
    <div className={classNames('flex flex-col gap-4', className)}>
      {files.map((file) => (
        <SimulationFile
          selected={file === selectedFile}
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
};

function SimulationOutputFiles({
  simulation,
  onSelect,
  selectedFile,
  context,
  className = '',
}: SimulationOutputFilesProps) {
  const simResult = useAtomValue(
    simResultBySimIdAtomFamily({ simulationId: simulation.id, context })
  );

  const files: File[] = useMemo(
    () =>
      sortBy(
        simResult.assets.map((asset) => ({ asset, entity: simResult })),
        (file) => file.asset.path
      ),
    [simResult]
  );

  return (
    <div className={classNames('flex flex-col gap-4', className)}>
      {files.map((file) => (
        <SimulationFile
          key={file.asset.id}
          file={file}
          selected={selectedFile === file}
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
