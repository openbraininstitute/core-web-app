import { RiBox3Line } from '@remixicon/react';
import { Empty, Spin } from 'antd';
import { atom, useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { NEURON_HEADING } from '@/features/circuit-nodes/types';
import { PaneResizeHandle, ShutPaneBar } from '@/features/circuit-viewer/pane-resize-handle';
import { useResultsSidePanel } from '@/features/scan-config/components/shared/results-layout';
import ReportDetailsView from '@/features/sonata-viewer/components/report-details-view';
import { ReportNodesTable } from '@/features/sonata-viewer/components/report-nodes-table';
import { ReportStatisticsPanel } from '@/features/sonata-viewer/components/report-statistics-panel';
import {
  framesWithin,
  groupingColumns,
  PopulationHeader,
  WhenNearView,
} from '@/features/sonata-viewer/components/report-view-parts';
import SonataViewerSkeleton from '@/features/sonata-viewer/components/sonata-viewer-skeleton';
import {
  DEFAULT_SCENE_SPEED,
  SceneSpeedSelect,
  VoltageScene,
} from '@/features/sonata-viewer/components/voltage-scene';
import { CHART_LINE_COLOR } from '@/features/sonata-viewer/constants';
import { useReportCellStatistics } from '@/features/sonata-viewer/hooks/use-report-cell-statistics';
import useSonataReport from '@/features/sonata-viewer/hooks/use-sonata-report';
import { reportStatistics } from '@/features/sonata-viewer/report-statistics';
import { useSimulationReport } from '@/features/sonata-viewer/simulation-reports-context';
import { createTimeCursor } from '@/features/sonata-viewer/time-cursor';
import {
  colourGroupPicks,
  traceGroupsOf,
  useTracePicks,
} from '@/features/sonata-viewer/trace-picks';
import { CollapsingControls } from '@/features/spike-viewer/components/collapsing-controls';
import { PlotHelp } from '@/features/spike-viewer/components/raster-plot-controls';
import { useNeuronSetColumns } from '@/features/spike-viewer/neuron-set-columns';
import { useReportPopulation } from '@/features/spike-viewer/report-populations';
import { useSimulation } from '@/features/spike-viewer/simulation-context';
import { replaySubject } from '@/features/spike-viewer/spike-replay/replay-subject';
import {
  TimeWindowFields,
  WindowResetButton,
} from '@/features/spike-viewer/spike-replay/time-window-fields';
import {
  LoadingFilePanes,
  OpenPanelButton,
  PANEL_FLOORS,
  StackedPanes,
} from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { TABLE_BOX_CLASS } from '@/features/spike-viewer/spike-statistics/statistics-plots';
import { meanTraceFigure } from '@/features/spike-viewer/spike-statistics/time-course-figures';
import { WindowChip } from '@/features/spike-viewer/spike-statistics/window-chip';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { Remote } from 'comlink';
import type { ComponentType } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { ColumnValues, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type { TracesTimeAxis } from '@/features/sonata-viewer/components/report-details-view';
import type { TimeRange } from '@/features/sonata-viewer/hooks/use-plot-listeners';
import type { CellFrames, SonataReportMetadata } from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';
import type { TimeCourse } from '@/features/spike-viewer/spike-statistics/statistics-plots';
import type { WorkspaceContext } from '@/types/common';

const ErrorFallback = SimpleErrorComponent as unknown as ComponentType<FallbackProps>;

const NO_TRACES: number[] = [];

/** Group by nothing: every trace on the one plot. */
const ALL = '__all__';

/** Whether a voltage report is played in 3D above its traces: kept across the simulations shown. */
const voltageSceneAtom = atom(false);
/** Frames the scene's recording is thinned to: smooth enough to play, small enough to hold. */
const SCENE_FRAMES = 2000;
const DEFAULT_SCENE_HEIGHT = 280;

export default function SonataViewer({
  entity,
  assetId,
  ctx,
  withStatistics = false,
}: {
  entity: ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
  /** Whether the report's statistics open beside it in a results layout, as a voltage report's do. */
  withStatistics?: boolean;
}) {
  const { metadata, worker, asset, error, isLoading } = useSonataReport({ entity, assetId, ctx });

  const assetFileName = asset?.path.split('/').pop();
  const report = useSimulationReport(assetFileName);
  const variableName = report?.variable_name !== 'v' ? report?.variable_name : undefined;

  // The recorded cells are listed against the circuit the campaign scanned.
  const { model } = useSimulation();
  const circuit = replaySubject(model)?.circuit;
  const { config: circuitConfig } = useCircuitConfig(circuit);
  const sidePanel = useResultsSidePanel();

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (isLoading || !metadata || !worker) {
    // Docked, as the view will be, with the table of the report before still in place.
    if (withStatistics && circuit && sidePanel?.target) {
      return (
        <LoadingFilePanes
          title={variableName ? 'Traces' : 'Voltage traces'}
          panelTitles={variableName ? ['Statistics'] : ['3D Player', 'Statistics']}
        />
      );
    }
    return <SonataViewerSkeleton />;
  }

  return (
    <SonataReportView
      metadata={metadata}
      worker={worker}
      variableName={variableName}
      circuit={circuit}
      circuitConfig={circuitConfig}
      reportPath={asset?.path}
      withStatistics={withStatistics}
    />
  );
}

/**
 * A loaded report: its population, every trace on one plot, and the table of
 * its recorded cells below.
 *
 * The table drives the plot. Its filter picks the cells drawn; ticked rows are
 * drawn each in a colour they keep while ticked, and the row under the pointer
 * is shown for as long as it is there. Without a circuit to list the cells
 * against there is no table, and the plot shows every trace.
 */
export function SonataReportView({
  metadata,
  worker,
  variableName,
  circuit,
  circuitConfig,
  reportPath,
  withStatistics = false,
}: {
  metadata: SonataReportMetadata;
  worker: Remote<SonataWorkerImpl>;
  variableName?: string;
  circuit: ICircuit | undefined;
  circuitConfig: ParsedCircuitConfig | undefined;
  /** The report's path, by which the population chosen for it is shared with the picker over the statistics. */
  reportPath?: string;
  /** Whether its statistics open beside it in a results layout. */
  withStatistics?: boolean;
}) {
  const { simulationPicker, timeline } = useSimulation();
  const populationNames = useMemo(() => metadata.populations.map((p) => p.name), [metadata]);
  const [chosenPopulation, setChosenPopulation] = useReportPopulation(
    reportPath,
    populationNames,
    metadata.populations[0]?.name
  );
  const population =
    metadata.populations.find((p) => p.name === chosenPopulation) ?? metadata.populations[0];
  const populationName = population?.name;

  // The recorded cells' node file, through the session the table shares: the
  // columns the plot can be grouped by, the config's neuron sets among them.
  const nodePopulation = circuitConfig?.nodes.find((n) => n.name === populationName);
  const sessionKey =
    circuit && nodePopulation
      ? nodesSessionKey(circuit.id, circuitConfig?.circuitAssetId ?? '', nodePopulation.name)
      : '';
  const { status, rowCount, columns, getColumn, getFilteredIndices, setDerivedColumns } =
    useNodesWorker({
      enabled: circuit !== undefined && nodePopulation !== undefined,
      circuitId: circuit?.id ?? '',
      circuitAssetId: circuitConfig?.circuitAssetId ?? '',
      population: nodePopulation,
    });
  const neuronSetColumns = useNeuronSetColumns({
    ready: status === 'ready',
    sessionKey,
    population: nodePopulation?.name,
    rowCount,
    columns,
    getFilteredIndices,
    setDerivedColumns,
  });
  const groupOptions = useMemo(
    () => groupingColumns([...neuronSetColumns, ...(columns ?? [])]),
    [neuronSetColumns, columns]
  );
  // A voltage report, played over the circuit above its traces, which mark where it is.
  const voltage = variableName === undefined && population?.dataUnits.toLowerCase() === 'mv';
  // Inside a results layout the traces are over the table, as a spike report's
  // raster is, and the panel beside them, once up, holds the statistics over
  // the scene. Either column can be shut on its side by the rule between
  // them, and any of the four panes by its own bar.
  const sidePanel = useResultsSidePanel();
  const docked = circuit !== undefined && withStatistics && sidePanel !== null;
  const dockedOpen = docked && (sidePanel?.open ?? false);
  const shuts = sidePanel?.shuts;
  // A voltage's panel has the 3D player over the statistics; another report's, only the statistics.
  const sceneUp = dockedOpen && shuts?.columns !== 'end' && shuts?.panel !== 'start';
  const plotsUp = dockedOpen && shuts?.columns !== 'end' && (!voltage || shuts?.panel !== 'end');
  const [sceneOn, setSceneOn] = useAtom(voltageSceneAtom);
  const showScene =
    (docked ? sceneUp : sceneOn) && voltage && circuit !== undefined && status === 'ready';
  // Docked the scene stays once it has been up: building it again costs the circuit's download.
  // Not while the layout slides: building the scene would stall the slide.
  const sliding = sidePanel?.sliding ?? false;
  const [sceneMounted, setSceneMounted] = useState(false);
  useEffect(() => {
    if (showScene && !sliding) setSceneMounted(true);
  }, [showScene, sliding]);
  const timeCursor = useMemo(() => createTimeCursor(), []);
  const [sceneData, setSceneData] = useState<{
    population: string;
    frames: CellFrames;
    range: [number, number];
  }>();
  // The frames the scene plays, wanted too by the statistics, whose mean is drawn from them.
  const wantFrames = (showScene || plotsUp) && !sliding;
  useEffect(() => {
    if (!wantFrames || !populationName || sceneData?.population === populationName) return;
    let cancelled = false;
    Promise.all([
      worker.getCellFrames(populationName, SCENE_FRAMES),
      worker.getValueRange(populationName),
    ])
      .then(([frames, range]) => {
        if (!cancelled) setSceneData({ population: populationName, frames, range });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wantFrames, populationName, sceneData?.population, worker]);
  const sceneFrames = sceneData?.population === populationName ? sceneData : undefined;
  const sceneBoxRef = useRef<HTMLDivElement>(null);
  const [sceneHeight, setSceneHeight] = useState(DEFAULT_SCENE_HEIGHT);

  const [chosenGroupBy, setChosenGroupBy] = useState(ALL);
  const groupBy = groupOptions.some((c) => c.name === chosenGroupBy) ? chosenGroupBy : ALL;
  const groupLabel = groupOptions.find((c) => c.name === groupBy)?.label ?? groupBy;
  const [groupColumn, setGroupColumn] = useState<{
    session: string;
    name: string;
    values: ColumnValues;
  }>();
  useEffect(() => {
    if (status !== 'ready' || groupBy === ALL) return;
    let cancelled = false;
    getColumn(groupBy)
      .then((values) => {
        if (!cancelled) setGroupColumn({ session: sessionKey, name: groupBy, values });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status, groupBy, getColumn, sessionKey]);

  // All tagged with their population, so switching it starts from all the cells.
  const [visible, setVisible] = useState<{ population: string; traces: number[] | null }>();
  const visibleTraces = visible?.population === populationName ? visible.traces : null;
  const pickKey = sessionKey || (populationName ?? '');
  const {
    pickedCells,
    pickedTraces,
    selectedNodeIds,
    tableCells,
    togglePick,
    pickAllState,
    togglePickAll,
    setPickedCells,
  } = useTracePicks({ pickKey, population, visibleTraces });

  const handleVisibleTraces = useCallback(
    (traces: number[] | null) => {
      if (populationName) setVisible({ population: populationName, traces });
    },
    [populationName]
  );

  // The row under the pointer in the table, which the plot shows for as long as it is there.
  const [hovered, setHovered] = useState<{ population: string; nodeId: number } | null>(null);
  const handleCellHover = useCallback(
    (nodeId: number | null) => {
      setHovered(
        nodeId === null || !populationName ? null : { population: populationName, nodeId }
      );
    },
    [populationName]
  );
  const hoveredTraces = useMemo(() => {
    if (!population || hovered?.population !== populationName) return NO_TRACES;
    const traces: number[] = [];
    population.traces.forEach((trace, traceIndex) => {
      if (trace.nodeId === hovered.nodeId) traces.push(traceIndex);
    });
    return traces;
  }, [population, populationName, hovered]);

  // The traces the table's filter keeps, split by the group-by column, in the
  // statistics' order. While cells are ticked only groups holding some show.
  const traceGroups = useMemo(() => {
    if (groupBy === ALL || !population) return null;
    if (groupColumn?.session !== sessionKey || groupColumn.name !== groupBy) return null;
    return traceGroupsOf(population, groupColumn.values, visibleTraces);
  }, [groupBy, population, groupColumn, sessionKey, visibleTraces]);
  const shownGroups = useMemo(() => {
    if (!traceGroups) return null;
    return traceGroups.flatMap((group) => {
      const inGroup = new Set(group.traces);
      const picked = pickedTraces.filter((p) => inGroup.has(p.traceIndex));
      if (pickedTraces.length > 0 && picked.length === 0) return [];
      const coloured = colourGroupPicks(
        picked,
        (p) => population?.traces[p.traceIndex]?.nodeId ?? p.traceIndex
      );
      return [{ ...group, picked: coloured, hovered: hoveredTraces.filter((t) => inGroup.has(t)) }];
    });
  }, [traceGroups, pickedTraces, hoveredTraces, population]);

  // Each recorded cell's statistics, worked out once the panel is up and kept as
  // columns of the session's, so the table sorts and filters by them.
  const statistics = useMemo(
    () => reportStatistics(population?.dataUnits ?? '', voltage ? null : (variableName ?? 'value')),
    [population?.dataUnits, voltage, variableName]
  );
  const tableColumns = useMemo(
    () => (columns ? [...neuronSetColumns, ...columns] : undefined),
    [neuronSetColumns, columns]
  );
  // A hovered line's cell, as the table has it: the file's columns and the statistics it pins.
  const cellRows = useMemo(
    () => (sessionKey ? { session: sessionKey, columns, statistics } : undefined),
    [sessionKey, columns, statistics]
  );
  // The traces' time window, shared by every plot of them: what the statistics are over.
  const [traceWindow, setTraceWindow] = useState<{ population: string; range: TimeRange } | null>(
    null
  );
  const timeWindow = traceWindow?.population === populationName ? traceWindow.range : null;
  const handleTimeWindowChange = useCallback(
    (range: TimeRange | null) => {
      setTraceWindow(range && populationName ? { population: populationName, range } : null);
    },
    [populationName]
  );
  const statisticValues = useReportCellStatistics({
    enabled: docked,
    worker,
    populationName,
    ready: status === 'ready',
    rowCount,
    timeWindow,
    voltage,
    statistics,
    setDerivedColumns,
  });

  // Shown at first beside the statistics: each group's mean over time.
  const meanLabel = `${voltage ? 'Mean voltage' : `Mean ${variableName ?? 'value'}`} (${population?.dataUnits ?? ''})`;
  const timeCourse = useMemo<TimeCourse>(
    () => ({
      label: 'Mean',
      figure: (groups, groupLabel) =>
        sceneFrames
          ? meanTraceFigure(
              groups,
              framesWithin(sceneFrames.frames, timeWindow),
              groupLabel,
              meanLabel,
              CHART_LINE_COLOR
            )
          : null,
      // Marked over the mean as over the raster: the config's timings, and where the player is.
      events: timeline,
      timeCursor,
    }),
    [sceneFrames, meanLabel, timeWindow, timeline, timeCursor]
  );

  // The plots are over the ticked cells, else those the table's filter keeps.
  const plotCells = useMemo(() => {
    if (pickedCells.length > 0) {
      return Uint32Array.from(pickedCells.map((c) => c.nodeId).sort((a, b) => a - b));
    }
    return visibleTraces ? Uint32Array.from(tableCells) : null;
  }, [pickedCells, visibleTraces, tableCells]);

  // The plots' cells as a flag per node index: the scene shows those alone.
  const sceneCells = useMemo(() => {
    if (!plotCells || rowCount === 0) return null;
    const flags = new Uint8Array(rowCount);
    for (const id of plotCells) if (id < rowCount) flags[id] = 1;
    return flags;
  }, [plotCells, rowCount]);

  // The row a click elsewhere brings into view.
  const [focusedRow, setFocusedRow] = useState<{ nodeId: number; key: number }>();
  const recordedNodes = useMemo(
    () => new Set(population?.traces.map((t) => t.nodeId)),
    [population]
  );
  // A line clicked in the traces picks its cell alone, holds it out in the
  // scene and brings its row into view; clicked again, it lets it go.
  const [heldCell, setHeldCell] = useState<{ key: string; nodeId: number } | null>(null);
  const handleTraceClick = useCallback(
    (nodeId: number) => {
      if (!pickKey) return;
      const alone = pickedCells.length === 1 && pickedCells[0].nodeId === nodeId;
      // It keeps its colour if it had one.
      const slot = pickedCells.find((c) => c.nodeId === nodeId)?.slot ?? 0;
      setPickedCells(alone ? [] : [{ nodeId, slot }]);
      setHeldCell(alone ? null : { key: pickKey, nodeId });
      if (!alone) setFocusedRow({ nodeId, key: performance.now() });
    },
    [pickKey, pickedCells, setPickedCells]
  );
  const held =
    heldCell?.key === pickKey && selectedNodeIds.has(heldCell.nodeId) ? heldCell.nodeId : undefined;
  // What the scene is narrowed to among the recorded cells, said over it with
  // the way back to them all: the table's own reset, its filters and ticks and
  // the traces' window, and the cell held with them.
  const [resetRequest, setResetRequest] = useState(0);
  const sceneSelection =
    plotCells && population
      ? {
          count: plotCells.length,
          total: population.nodeCount,
          onReset: () => {
            setHeldCell(null);
            setResetRequest((n) => n + 1);
          },
        }
      : undefined;

  // A recorded cell clicked in the scene, the same.
  const handleSceneCellClick = useCallback(
    (nodeId: number) => {
      if (recordedNodes.has(nodeId)) handleTraceClick(nodeId);
    },
    [recordedNodes, handleTraceClick]
  );

  // Docked, the panel's statistics box holds the plots, which the statistics
  // under the traces portal in, so the two share one tree.
  const [plotsSlot, setPlotsSlot] = useState<HTMLDivElement | null>(null);
  // Docked, the scene's play and scrubber are under the traces, the scrubber
  // under their time axis, and its speed is with their controls.
  const [sceneSpeed, setSceneSpeed] = useState(DEFAULT_SCENE_SPEED);
  const [transportSlot, setTransportSlot] = useState<HTMLDivElement | null>(null);
  const [tracesAxis, setTracesAxis] = useState<TracesTimeAxis | null>(null);

  if (!population) {
    return <Empty className="p-2em" description="This report recorded no population" />;
  }

  // At the right end of the traces' controls: how many cells, then how the plot is worked.
  const countAndHelp = (
    <>
      <span className="whitespace-nowrap text-xs text-neutral-400">
        {population.nodeCount.toLocaleString()} {population.nodeCount === 1 ? 'cell' : 'cells'}{' '}
        recorded
      </span>
      <PlotHelp>
        Drag to zoom: the time bar and the statistics follow the window · Double-click to reset ·
        Click a trace to pick its cell alone, again to show every cell · Hover a timing for its
        window
      </PlotHelp>
    </>
  );

  // The traces' span of time, to read and to type, and the way back to the whole run.
  const timeBar = (
    <>
      <TimeWindowFields
        from={timeWindow?.[0] ?? population.timeConfig.startTime}
        to={timeWindow?.[1] ?? population.timeConfig.endTime}
        min={population.timeConfig.startTime}
        max={population.timeConfig.endTime}
        onChange={(from, to) => handleTimeWindowChange([from, to])}
      />
      <WindowResetButton
        zoomed={timeWindow !== null}
        title="Back to the whole run"
        onReset={() => handleTimeWindowChange(null)}
      />
    </>
  );

  const groupSelect = groupOptions.length > 0 && (
    <PillSelect
      label="Group by"
      value={groupBy}
      options={[
        { value: ALL, label: 'All' },
        ...groupOptions.map((c) => ({
          value: c.name,
          label: c.label ?? c.name,
          heading: NEURON_HEADING,
        })),
      ]}
      onChange={setChosenGroupBy}
    />
  );

  const scene =
    (docked ? sceneMounted : showScene) && circuit && populationName ? (
      <VoltageScene
        circuit={circuit}
        populationName={populationName}
        cellCount={rowCount}
        frames={sceneFrames?.frames ?? null}
        valueRange={sceneFrames?.range ?? null}
        units={population.dataUnits}
        timeCursor={timeCursor}
        highlightedCell={hovered?.population === populationName ? hovered.nodeId : held}
        shownCells={sceneCells ?? undefined}
        selection={sceneSelection}
        onCellClick={handleSceneCellClick}
        bare={docked}
        active={showScene}
        speed={sceneSpeed}
        onSpeedChange={setSceneSpeed}
        transportTarget={docked ? transportSlot : undefined}
        timeAxis={groupBy === ALL ? tracesAxis : null}
      />
    ) : null;

  const traces =
    groupBy === ALL ? (
      <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[metadata, population]}>
        <ReportDetailsView
          key={population.name}
          population={population}
          worker={worker}
          visibleTraces={visibleTraces}
          picked={pickedTraces}
          hovered={hoveredTraces}
          variableName={variableName}
          timeCursor={showScene ? timeCursor : undefined}
          onTimeAxisChange={setTracesAxis}
          timeWindow={timeWindow}
          onTimeWindowChange={handleTimeWindowChange}
          cellRows={cellRows}
          onCellClick={handleTraceClick}
          events={timeline}
        />
      </ErrorBoundary>
    ) : shownGroups === null ? (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Spin />
      </div>
    ) : shownGroups.length === 0 ? (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Empty description="No recorded cell passes the table’s filter" />
      </div>
    ) : (
      // A plot per group, one under another: the same axes throughout, so
      // they compare at a glance, and each drawn only once it is near view.
      <div className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {shownGroups.map((group) => (
          <section key={group.name} className="mb-2">
            <div className="flex items-baseline gap-1.5 text-xs">
              <span className="text-neutral-400">{groupLabel}</span>
              <span className="text-primary-9 font-semibold">{group.name}</span>
              <span className="text-neutral-400">
                · {group.cells.toLocaleString()} {group.cells === 1 ? 'cell' : 'cells'}
              </span>
            </div>
            <WhenNearView className="flex h-[240px] flex-col">
              <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[metadata, population]}>
                <ReportDetailsView
                  key={`${population.name}:${groupBy}:${group.name}`}
                  population={population}
                  worker={worker}
                  visibleTraces={group.traces}
                  picked={group.picked}
                  hovered={group.hovered}
                  variableName={variableName}
                  timeCursor={showScene ? timeCursor : undefined}
                  timeWindow={timeWindow}
                  onTimeWindowChange={handleTimeWindowChange}
                  cellRows={cellRows}
                  onCellClick={handleTraceClick}
                  events={timeline}
                />
              </ErrorBoundary>
            </WhenNearView>
          </section>
        ))}
      </div>
    );

  // The table of the recorded cells, wherever it goes: under the traces, or in the panel.
  const table = circuit && {
    circuit,
    circuitConfig,
    population,
    onVisibleTracesChange: handleVisibleTraces,
    onCellClick: togglePick,
    selectedNodeIds,
    pickAll: { state: pickAllState, onToggle: togglePickAll },
    onCellHover: handleCellHover,
    extraColumns: neuronSetColumns,
    headerExtra: docked && timeWindow && (
      <WindowChip
        name="Trace window"
        title="The traces' zoom, which the table's statistics and the plots follow: click to see the whole run again"
        time={timeWindow}
        cells={null}
        onClear={() => handleTimeWindowChange(null)}
      />
    ),
  };

  if (docked && table && sidePanel) {
    const plotted = plotCells ? plotCells.length : population.nodeCount;
    const tracesTitle = voltage ? 'Voltage traces' : 'Traces';
    const plotsPane = {
      title: 'Statistics',
      content: <div ref={setPlotsSlot} className="flex h-full min-h-0 flex-col" />,
    };
    const panelTitles = voltage ? ['3D Player', 'Statistics'] : ['Statistics'];
    return (
      <>
        {/* The traces over the table, and while the panel is not up a button over them opening it. */}
        <StackedPanes
          split="file"
          header={
            !dockedOpen && (
              <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <PopulationHeader
                  populations={metadata.populations}
                  population={population}
                  onChange={setChosenPopulation}
                />
                {/* The simulation on show is picked in the list beside it. */}
                <OpenPanelButton titles={panelTitles} onOpen={() => sidePanel.setOpen(true)} />
              </div>
            )
          }
          top={{
            title: tracesTitle,
            boxClassName: 'p-2',
            content: (
              <>
                {/* Folded into one Options pill when the pane is too narrow for them. */}
                <div className="shrink-0 px-1 pb-1">
                  <CollapsingControls inline trailing={countAndHelp}>
                    {groupSelect}
                    {showScene && (
                      <SceneSpeedSelect speed={sceneSpeed} onSpeedChange={setSceneSpeed} />
                    )}
                    {timeBar}
                  </CollapsingControls>
                </div>
                {traces}
                {/* The 3D player's play and scrubber, while it is up. */}
                <div ref={setTransportSlot} className="shrink-0" />
              </>
            ),
          }}
          bottom={{
            title: 'Neuron Table',
            boxClassName: 'px-3 pt-1 pb-2',
            content: (
              <ReportStatisticsPanel
                key={population.name}
                tableOnly={!plotsUp || sliding}
                plotsTarget={plotsSlot}
                timeCourse={timeCourse}
                statistics={statistics}
                values={statisticValues}
                cells={plotCells}
                columns={tableColumns}
                ready={status === 'ready'}
                sessionKey={sessionKey}
                getColumn={getColumn}
                color={CHART_LINE_COLOR}
                spanMs={
                  timeWindow
                    ? timeWindow[1] - timeWindow[0]
                    : population.timeConfig.endTime - population.timeConfig.startTime
                }
                summary={
                  <span className="whitespace-nowrap text-xs text-neutral-400">
                    {plotted.toLocaleString()} {plotted === 1 ? 'cell' : 'cells'}
                    {pickedCells.length > 0
                      ? ' ticked'
                      : visibleTraces
                        ? ' in the table’s filter'
                        : ' recorded'}
                  </span>
                }
                table={{
                  ...table,
                  reset: {
                    picked: pickedCells.length > 0 || timeWindow !== null,
                    onReset: () => {
                      setPickedCells([]);
                      handleTimeWindowChange(null);
                    },
                  },
                  focusRow: focusedRow,
                  resetRequest,
                }}
              />
            ),
          }}
        />
        {/* The panel beside them: the 3D player over the statistics. */}
        {sidePanel.target &&
          createPortal(
            <StackedPanes
              split="panel"
              floors={PANEL_FLOORS}
              top={
                voltage
                  ? {
                      title: '3D Player',
                      keepsSize: true,
                      boxClassName: 'px-2 pt-2',
                      content: scene,
                    }
                  : plotsPane
              }
              bottom={voltage ? plotsPane : null}
            />,
            sidePanel.target
          )}
        {/* With the rule shut over either column, one bar naming its panes, in the strip it leaves */}
        {sidePanel.fileStrip &&
          createPortal(
            <ShutPaneBar
              upright
              title={[tracesTitle, 'Neuron Table']}
              onOpen={sidePanel.openColumns}
            />,
            sidePanel.fileStrip
          )}
        {sidePanel.panelStrip &&
          createPortal(
            <ShutPaneBar upright title={panelTitles} onOpen={sidePanel.openColumns} />,
            sidePanel.panelStrip
          )}
      </>
    );
  }

  return (
    // Full height, so the plot and the table split the panel between them. The
    // file viewer hands this the bare pane: the inset is its own, so the header
    // row lines up with the files column's first heading.
    // With the scene above them, the traces and the table share less room;
    // past their floors the pane scrolls rather than stacking them over each other.
    <div
      className={cn(
        '@container flex h-full min-h-0 flex-col gap-3 px-4 pt-1.25 pb-4',
        showScene && 'secondary-scrollbar overflow-y-auto'
      )}
    >
      {/* The campaign's own picker for the simulation on show, where there is one. */}
      {/* Wraps rather than squeezes: the simulation picker drops to a row of its own. */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <PopulationHeader
            populations={metadata.populations}
            population={population}
            onChange={setChosenPopulation}
          />
          {voltage && circuit && (
            <button
              type="button"
              aria-pressed={sceneOn}
              onClick={() => setSceneOn(!sceneOn)}
              title="Play the recording over the circuit, above its traces"
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold shadow-md ring-1 ring-black/5 transition-colors',
                sceneOn ? 'bg-primary-9 text-white' : 'text-primary-9 bg-white hover:bg-neutral-50'
              )}
            >
              <RiBox3Line className="size-4" />
              3D
            </button>
          )}
          {groupSelect}
          {timeBar}
        </div>
        <div className="flex min-w-0 items-center gap-3">
          {simulationPicker}
          <div className="flex items-center gap-2">{countAndHelp}</div>
        </div>
      </div>

      {scene && (
        <div ref={sceneBoxRef} className="relative shrink-0" style={{ height: sceneHeight }}>
          {scene}
          <PaneResizeHandle
            containerRef={sceneBoxRef}
            minHeight={160}
            onResize={(height) => setSceneHeight(Math.min(height, 900))}
            edge="bottom"
          />
        </div>
      )}

      <div className={cn('flex flex-[3] flex-col', showScene ? 'min-h-[200px]' : 'min-h-[240px]')}>
        {traces}
      </div>

      {table && (
        <div
          className={cn(
            TABLE_BOX_CLASS,
            'flex flex-[2] flex-col',
            showScene ? 'min-h-[220px]' : 'min-h-[180px]'
          )}
        >
          <ReportNodesTable key={population.name} {...table} />
        </div>
      )}
    </div>
  );
}
