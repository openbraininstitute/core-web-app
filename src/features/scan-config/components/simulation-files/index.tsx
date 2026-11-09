import { sortBy } from 'es-toolkit/compat';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';

import { NodePopulationType } from '@/api/entitycore/types/entities/circuit';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { simResultBySimIdAtomFamily, useModelQuery } from '@/features/scan-config/components/atoms';
import { hasStatistics, isVoltageReportFile } from '@/features/scan-config/components/file-viewer';
import { IoLayout } from '@/features/scan-config/components/shared/io-layout';
import { TaskIOFileGroup } from '@/features/scan-config/components/shared/task-io-file-group';
import { TaskIOFileItem } from '@/features/scan-config/components/shared/task-io-file-item';
import { useAutoSelectFileOnConfigChange } from '@/features/scan-config/components/shared/use-auto-select';
import { prioritizeOutputFiles } from '@/features/scan-config/components/simulation-files/output-order';
import {
  ActivityCustomFileRenderer,
  isAssetBackedFile,
  type TActivityCustomFile,
  type TAssetBackedFile,
} from '@/features/scan-config/types';
import {
  isLfpReport,
  reportName,
  reportStem,
  reportTag,
} from '@/features/scan-config/use-cases/simulations/report-picker';
import {
  chosenReportPopulationAtom,
  reportPopulationsAtom,
} from '@/features/spike-viewer/report-populations';
import { replaySubject } from '@/features/spike-viewer/spike-replay/replay-subject';
import {
  makeLogStreamFileDescriptors,
  makeTaskConfigurationFile,
  makeTaskLogsFile,
  prependLogStreamFile,
} from '@/features/task-logs-stream/descriptor';
import { useLastTruthyValue } from '@/hooks/hooks';
import { createLoadableAtom } from '@/utils/jotai-loadable';

import type { ReactNode } from 'react';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';
import type { ITaskConfig } from '@/api/entitycore/types/entities/task-config';
import type { WorkspaceContext } from '@/types/common';

/** A row of the files column: a file, or one of a report's populations. */
type FileRow = {
  file: TAssetBackedFile;
  name: string | undefined;
  /** In place of the file's extension, such as what a report records. */
  label?: ReactNode;
  population: string | undefined;
  selected: boolean;
};

/**
 * The simulation's own files, named for what they are rather than by their file
 * names; its OBI-ONE config is named so by the file row, in every workflow.
 */
const SIMULATION_FILE_NAMES: Partial<Record<string, string>> = {
  [AssetLabel.custom_node_sets]: 'Node sets',
  [AssetLabel.sonata_simulation_config]: 'SONATA Simulation Config',
};

/** Which of the groups are open: kept as the simulation on show changes. */
const openGroupsAtom = atom({ circuit: false, simulation: false, result: false });

const NO_FILES: TAssetBackedFile[] = [];

type SimulationFilesProps = {
  simulation: ISimulation;
  execStatus: ActivityStatus;
  selectedFile?: TActivityCustomFile;
  onSelect: (file: TActivityCustomFile) => void;
  onLoadingChange: (loading: boolean) => void;
  context: WorkspaceContext;
  jobId?: string;
  /** The SONATA config's reports, by name: what each of the result's reports records. */
  reports?: Record<string, unknown> | null;
};

export function SimulationFiles({
  simulation,
  execStatus,
  selectedFile,
  onSelect,
  onLoadingChange,
  context,
  jobId,
  reports,
}: SimulationFilesProps) {
  const [inputLoading, inputFiles] = useInputFiles(simulation, context);

  const outputAvailable =
    !!execStatus && [ActivityStatus.ERROR, ActivityStatus.DONE].includes(execStatus);

  const [outputLoading, outputFiles] = useSimulationResultFiles(
    simulation.id,
    context,
    outputAvailable
  );

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

  const selectedAssetPath =
    selectedFile && isAssetBackedFile(selectedFile)
      ? (selectedFile.assetPath ?? selectedFile.asset.path)
      : undefined;

  const prioritizedInputFiles = useMemo(() => {
    const selectedPath = selectedAssetPath;

    return [...inputFilesWithLogs].sort((a, b) => {
      const aSelected = a.asset.path === selectedPath;
      const bSelected = b.asset.path === selectedPath;
      if (aSelected !== bSelected) return aSelected ? -1 : 1;

      const aPreferred = a.asset.label === AssetLabel.sonata_circuit;
      const bPreferred = b.asset.label === AssetLabel.sonata_circuit;
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;

      return 0;
    });
  }, [inputFilesWithLogs, selectedAssetPath]);

  const prioritizedOutputFiles = useMemo(
    () => prioritizeOutputFiles(outputFilesWithLogs, selectedAssetPath),
    [outputFilesWithLogs, selectedAssetPath]
  );

  // Notify parent component about the loading state
  useEffect(() => {
    onLoadingChange(loading);
  }, [loading, onLoadingChange]);

  // Nothing is picked while the result's files load: the logs row comes in ahead
  // of them, and the pick is made once. Arriving, the tab opens on the spikes; a
  // pick of another simulation keeps the file on show until its like is in.
  const awaitingResult = outputAvailable && outputLoading;
  useAutoSelectFileOnConfigChange({
    configId: simulation.id,
    selectedFile,
    inputFiles: awaitingResult ? NO_FILES : prioritizedInputFiles,
    outputFiles: awaitingResult ? NO_FILES : prioritizedOutputFiles,
    onSelect,
  });

  // The circuit's files, the simulation's and its result's, each as one pill that opens to list them.
  const [open, setOpen] = useAtom(openGroupsAtom);
  // The model's files are the circuit's, not the simulation's.
  const isCircuitFile = (file: TAssetBackedFile) => file.entity.id === simulation.entity_id;
  const circuitFiles = inputFilesWithLogs.filter(isCircuitFile);
  // By the path a row opens, as the selection is: the circuit's row is its
  // directory asset opened at circuit_config.json.
  const isSelected = (file: TAssetBackedFile) =>
    file.id
      ? file.id === selectedFile?.id
      : (file.assetPath ?? file.asset.path) === selectedAssetPath;
  // A report reads as the picker over the statistics lists it, a row per population:
  // "Spikes: S1nonbarrel_neurons". Until it has been opened its populations are the
  // circuit's own that are not virtual, which are what a simulation records.
  const published = useAtomValue(reportPopulationsAtom);
  const [chosenPopulations, setChosenPopulations] = useAtom(chosenReportPopulationAtom);
  const { entity: model } = useModelQuery({ id: simulation.entity_id, context });
  const { config: circuitConfig } = useCircuitConfig(replaySubject(model ?? null)?.circuit);
  const recordable = useMemo(
    () =>
      circuitConfig?.nodes
        .filter((n) => n.type !== NodePopulationType.Virtual)
        .map((n) => n.name) ?? [],
    [circuitConfig]
  );
  const rowsOf = (files: TAssetBackedFile[]): FileRow[] =>
    files.flatMap((file): FileRow[] => {
      // An input's spikes, or an extracellular report, read as their file's
      // name, tagged as what they are.
      if (file.asset.label === AssetLabel.replay_spikes || isLfpReport(file, reports)) {
        return [
          {
            file,
            name: reportStem(file),
            label: tagOf(reportTag(file, reports)),
            population: undefined,
            selected: isSelected(file),
          },
        ];
      }
      if (file.asset.label !== AssetLabel.spike_report && !isVoltageReportFile(file)) {
        return [
          {
            file,
            name: SIMULATION_FILE_NAMES[file.asset.label] ?? file.name,
            population: undefined,
            selected: isSelected(file),
          },
        ];
      }
      const known = published[file.asset.path];
      const populations = known?.populations ?? recordable;
      // A spike file reads as its populations, a voltage report as its name, its
      // tag in place of the extension saying what each records.
      const label = tagOf(reportTag(file, reports));
      if (populations.length === 0) {
        return [
          {
            file,
            name: reportName(file, undefined, 0),
            label,
            population: undefined,
            selected: isSelected(file),
          },
        ];
      }
      const shown = known?.current ?? chosenPopulations[file.asset.path] ?? populations[0];
      return populations.map((population) => ({
        file,
        name: reportName(file, population, populations.length),
        label,
        population,
        selected: isSelected(file) && population === shown,
      }));
    });
  const group = (key: keyof typeof open, title: string, files: TAssetBackedFile[]) => {
    const rows = rowsOf(files);
    return (
      files.length > 0 && (
        <TaskIOFileGroup
          key={key}
          title={title}
          count={rows.length}
          selected={files.some(isSelected)}
          expanded={open[key]}
          onToggle={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
        >
          {rows.map(({ file, name, label, population, selected }) => {
            const id = `${file.id ?? file.asset.id}${population ? `:${population}` : ''}`;
            return (
              <TaskIOFileItem
                id={id}
                key={id}
                selected={selected}
                file={file}
                name={name}
                label={label}
                interactive={hasStatistics(file)}
                onSelect={() => {
                  if (population) {
                    setChosenPopulations((previous) => ({
                      ...previous,
                      [file.asset.path]: population,
                    }));
                  }
                  onSelect(file);
                }}
              />
            );
          })}
        </TaskIOFileGroup>
      )
    );
  };
  return (
    <IoLayout
      showOutput={outputAvailable || logStreamFiles.showOutput}
      inputIsEmpty={inputFilesWithLogs.length === 0}
      outputIsEmpty={outputFilesWithLogs.length === 0 && !outputLoading}
      inputItems={
        <>
          {group('circuit', 'Circuit', circuitFiles)}
          {group(
            'simulation',
            'Simulation',
            inputFilesWithLogs.filter((file) => !isCircuitFile(file))
          )}
        </>
      }
      outputItems={group('result', 'Simulation Result', outputFilesWithLogs)}
    />
  );
}

function useInputFiles(
  simulation: ISimulation,
  context: WorkspaceContext
): [boolean, TAssetBackedFile[]] {
  const { entity, isLoading } = useModelQuery({
    id: simulation.entity_id,
    context,
  });

  const inputFiles: TAssetBackedFile[] = useMemo(() => {
    const sonataCircuitAsset =
      entity && 'assets' in entity
        ? entity.assets?.find((asset) => asset.label === AssetLabel.sonata_circuit)
        : null;

    const files: TAssetBackedFile[] = [];

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

/** A simulation's result files, once it has run: whether they are loading, and the files. */
export function useSimulationResultFiles(
  simulationId: string,
  context: WorkspaceContext,
  enabled: boolean
): [boolean, TAssetBackedFile[]] {
  const simResultAtom = simResultBySimIdAtomFamily({
    simulationId,
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

/**
 * A report's tag, its words over two lines where there are two: set a little
 * tighter, reaching into the pill's side padding, so a long word such as
 * "Extracellular" fits the narrow column.
 */
function tagOf(words: string[]): ReactNode {
  if (words.length < 2) return words[0];
  return (
    <span className="-mx-2 block text-center text-[10px] leading-tight tracking-tight">
      {words[0]}
      <br />
      {words.slice(1).join(' ')}
    </span>
  );
}
