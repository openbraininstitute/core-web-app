import { RiBox3Line } from '@remixicon/react';
import { Empty, Spin } from 'antd';
import { atom, useAtom } from 'jotai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { PopulationSelect } from '@/features/circuit-nodes/components/population-select';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { PaneResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import ReportDetailsView, {
  sharedTracesHint,
} from '@/features/sonata-viewer/components/report-details-view';
import { ReportNodesTable } from '@/features/sonata-viewer/components/report-nodes-table';
import SonataViewerSkeleton from '@/features/sonata-viewer/components/sonata-viewer-skeleton';
import { VoltageScene } from '@/features/sonata-viewer/components/voltage-scene';
import { PICK_COLORS } from '@/features/sonata-viewer/constants';
import useSonataReport from '@/features/sonata-viewer/hooks/use-sonata-report';
import { useSimulationReport } from '@/features/sonata-viewer/simulation-reports-context';
import { createTimeCursor } from '@/features/sonata-viewer/time-cursor';
import { useNeuronSetColumns } from '@/features/spike-viewer/neuron-set-columns';
import { useSimulation } from '@/features/spike-viewer/simulation-context';
import { replaySubject } from '@/features/spike-viewer/spike-replay/replay-subject';
import { compareGroupNames } from '@/features/spike-viewer/spike-statistics/statistics';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { Remote } from 'comlink';
import type { ComponentType, ReactNode } from 'react';
import type { FallbackProps } from 'react-error-boundary';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { ColumnMeta, ColumnValues, ParsedCircuitConfig } from '@/features/circuit-nodes/types';
import type {
  CellFrames,
  PickedTrace,
  PopulationMetadata,
  SonataReportMetadata,
} from '@/features/sonata-viewer/types';
import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';
import type { WorkspaceContext } from '@/types/common';

const ErrorFallback = SimpleErrorComponent as unknown as ComponentType<FallbackProps>;

/** A cell picked to draw, and the colour slot it keeps while picked. */
type Pick = { nodeId: number; slot: number };

const NO_PICKS: Pick[] = [];
const NO_TRACES: number[] = [];

/** Group by nothing: every trace on the one plot. */
const ALL = '__all__';

/** Whether a voltage report is played in 3D above its traces: kept across the simulations shown. */
const voltageSceneAtom = atom(false);
/** Frames the scene's recording is thinned to: smooth enough to play, small enough to hold. */
const SCENE_FRAMES = 2000;
const DEFAULT_SCENE_HEIGHT = 280;
/** Past this many values a property is closer to an id than a group. */
const MAX_GROUPS = 80;

export default function SonataViewer({
  entity,
  assetId,
  ctx,
}: {
  entity: ISimulationResult;
  assetId?: string;
  ctx?: WorkspaceContext;
}) {
  const { metadata, worker, asset, error, isLoading } = useSonataReport({ entity, assetId, ctx });

  const assetFileName = asset?.path.split('/').pop();
  const report = useSimulationReport(assetFileName);
  const variableName = report?.variable_name !== 'v' ? report?.variable_name : undefined;

  // The recorded cells are listed against the circuit the campaign scanned.
  const { model } = useSimulation();
  const circuit = replaySubject(model)?.circuit;
  const { config: circuitConfig } = useCircuitConfig(circuit);

  if (error) {
    return (
      <Empty className="p-2em" description="There was a problem loading the required resources" />
    );
  }

  if (isLoading || !metadata || !worker) {
    return <SonataViewerSkeleton />;
  }

  return (
    <SonataReportView
      metadata={metadata}
      worker={worker}
      variableName={variableName}
      circuit={circuit}
      circuitConfig={circuitConfig}
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
}: {
  metadata: SonataReportMetadata;
  worker: Remote<SonataWorkerImpl>;
  variableName?: string;
  circuit: ICircuit | undefined;
  circuitConfig: ParsedCircuitConfig | undefined;
}) {
  const { simulationPicker } = useSimulation();
  const [chosenPopulation, setChosenPopulation] = useState<string>();
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
  const [sceneOn, setSceneOn] = useAtom(voltageSceneAtom);
  const showScene = sceneOn && voltage && circuit !== undefined && status === 'ready';
  const timeCursor = useMemo(() => createTimeCursor(), []);
  const [sceneData, setSceneData] = useState<{
    population: string;
    frames: CellFrames;
    range: [number, number];
  }>();
  useEffect(() => {
    if (!showScene || !populationName || sceneData?.population === populationName) return;
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
  }, [showScene, populationName, sceneData?.population, worker]);
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
  const [picks, setPicks] = useState<{ population: string; cells: Pick[] }>();
  const pickedCells = picks?.population === populationName ? picks.cells : NO_PICKS;

  const handleVisibleTraces = useCallback(
    (traces: number[] | null) => {
      if (populationName) setVisible({ population: populationName, traces });
    },
    [populationName]
  );

  // A click ticks a row or unticks it. A new pick takes the first free colour,
  // so the others keep theirs.
  const togglePick = useCallback(
    (nodeId: number) => {
      if (!populationName) return;
      setPicks((previous) => {
        const cells = previous?.population === populationName ? previous.cells : NO_PICKS;
        if (cells.some((c) => c.nodeId === nodeId)) {
          return { population: populationName, cells: cells.filter((c) => c.nodeId !== nodeId) };
        }
        const taken = new Set(cells.map((c) => c.slot));
        const slot = PICK_COLORS.findIndex((_, s) => !taken.has(s));
        return { population: populationName, cells: [...cells, { nodeId, slot }] };
      });
    },
    [populationName]
  );

  const pickedTraces = useMemo<PickedTrace[]>(() => {
    const traces: PickedTrace[] = [];
    for (const cell of pickedCells) {
      population?.traces.forEach((trace, traceIndex) => {
        if (trace.nodeId === cell.nodeId) traces.push({ traceIndex, slot: cell.slot });
      });
    }
    return traces;
  }, [population, pickedCells]);

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

  const selectedNodeIds = useMemo<ReadonlySet<number>>(
    () => new Set(pickedCells.map((c) => c.nodeId)),
    [pickedCells]
  );

  // The tick atop the tick column, over the cells the table's filter keeps:
  // ticks every one of them, in node order, or unticks them all.
  const tableCells = useMemo(() => {
    const ids = new Set<number>();
    if (!population) return [];
    if (visibleTraces) for (const t of visibleTraces) ids.add(population.traces[t].nodeId);
    else for (const trace of population.traces) ids.add(trace.nodeId);
    return [...ids].sort((a, b) => a - b);
  }, [population, visibleTraces]);
  const tickedInTable = tableCells.filter((id) => selectedNodeIds.has(id)).length;
  const pickAllState =
    tickedInTable === 0 ? 'none' : tickedInTable === tableCells.length ? 'all' : 'some';
  const togglePickAll = () => {
    if (!populationName) return;
    const inTable = new Set(tableCells);
    setPicks((previous) => {
      const cells = previous?.population === populationName ? previous.cells : NO_PICKS;
      if (pickAllState === 'all') {
        return { population: populationName, cells: cells.filter((c) => !inTable.has(c.nodeId)) };
      }
      const next = [...cells];
      const have = new Set(next.map((c) => c.nodeId));
      const taken = new Set(next.map((c) => c.slot));
      for (const nodeId of tableCells) {
        if (have.has(nodeId)) continue;
        const slot = PICK_COLORS.findIndex((_, s) => !taken.has(s));
        taken.add(slot);
        next.push({ nodeId, slot });
      }
      return { population: populationName, cells: next };
    });
  };

  // The traces the table's filter keeps, split by the group-by column, in the
  // statistics' order. While cells are ticked only groups holding some show.
  const traceGroups = useMemo(() => {
    if (groupBy === ALL || !population) return null;
    if (groupColumn?.session !== sessionKey || groupColumn.name !== groupBy) return null;
    const values = groupColumn.values;
    if (values.kind !== 'categorical') return null;
    const kept = visibleTraces ? new Set(visibleTraces) : null;
    const byName = new Map<string, number[]>();
    population.traces.forEach((trace, traceIndex) => {
      if (kept && !kept.has(traceIndex)) return;
      const name = values.library[values.indices[trace.nodeId]] ?? '';
      const traces = byName.get(name);
      if (traces) traces.push(traceIndex);
      else byName.set(name, [traceIndex]);
    });
    return [...byName]
      .map(([name, traces]) => ({
        name,
        traces,
        cells: new Set(traces.map((t) => population.traces[t].nodeId)).size,
      }))
      .sort((a, b) => compareGroupNames(a.name, b.name));
  }, [groupBy, population, groupColumn, sessionKey, visibleTraces]);
  const shownGroups = useMemo(() => {
    if (!traceGroups) return null;
    return traceGroups.flatMap((group) => {
      const inGroup = new Set(group.traces);
      const picked = pickedTraces.filter((p) => inGroup.has(p.traceIndex));
      if (pickedTraces.length > 0 && picked.length === 0) return [];
      return [{ ...group, picked, hovered: hoveredTraces.filter((t) => inGroup.has(t)) }];
    });
  }, [traceGroups, pickedTraces, hoveredTraces]);

  if (!population) {
    return <Empty className="p-2em" description="This report recorded no population" />;
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
          {groupOptions.length > 0 && (
            <PillSelect
              label="Group by"
              value={groupBy}
              options={[
                { value: ALL, label: 'All' },
                ...groupOptions.map((c) => ({ value: c.name, label: c.label ?? c.name })),
              ]}
              onChange={setChosenGroupBy}
            />
          )}
        </div>
        {simulationPicker}
      </div>

      {showScene && circuit && populationName && (
        <div ref={sceneBoxRef} className="relative shrink-0" style={{ height: sceneHeight }}>
          <VoltageScene
            circuit={circuit}
            populationName={populationName}
            cellCount={rowCount}
            frames={sceneFrames?.frames ?? null}
            valueRange={sceneFrames?.range ?? null}
            units={population.dataUnits}
            timeCursor={timeCursor}
          />
          <PaneResizeHandle
            containerRef={sceneBoxRef}
            minHeight={160}
            onResize={(height) => setSceneHeight(Math.min(height, 900))}
            edge="bottom"
          />
        </div>
      )}

      <div className={cn('flex flex-[3] flex-col', showScene ? 'min-h-[200px]' : 'min-h-[240px]')}>
        {groupBy === ALL ? (
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
                  <ErrorBoundary
                    FallbackComponent={ErrorFallback}
                    resetKeys={[metadata, population]}
                  >
                    <ReportDetailsView
                      key={`${population.name}:${groupBy}:${group.name}`}
                      population={population}
                      worker={worker}
                      visibleTraces={group.traces}
                      picked={group.picked}
                      hovered={group.hovered}
                      variableName={variableName}
                      timeCursor={showScene ? timeCursor : undefined}
                    />
                  </ErrorBoundary>
                </WhenNearView>
              </section>
            ))}
          </div>
        )}
      </div>

      {circuit && (
        <div
          className={cn(
            'border-neutral-2 flex flex-[2] flex-col border-t pt-2',
            showScene ? 'min-h-[220px]' : 'min-h-[180px]'
          )}
        >
          <ReportNodesTable
            key={population.name}
            circuit={circuit}
            circuitConfig={circuitConfig}
            population={population}
            onVisibleTracesChange={handleVisibleTraces}
            onCellClick={togglePick}
            selectedNodeIds={selectedNodeIds}
            pickAll={{ state: pickAllState, onToggle: togglePickAll }}
            onCellHover={handleCellHover}
            extraColumns={neuronSetColumns}
            note={
              groupBy === ALL
                ? sharedTracesHint(
                    pickedTraces.length,
                    visibleTraces?.length ?? population.traces.length
                  )
                : pickedTraces.length > 0
                  ? null
                  : 'Tick rows in the table below to pick which cells to compare'
            }
          />
        </div>
      )}
    </div>
  );
}

/** The population the plot and the table are showing, and the switch between populations. */
function PopulationHeader({
  populations,
  population,
  onChange,
}: {
  populations: PopulationMetadata[];
  population: PopulationMetadata;
  onChange: (name: string) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {populations.length > 1 ? (
        <PopulationSelect
          variant="chrome"
          populations={populations}
          value={population.name}
          onChange={onChange}
        />
      ) : (
        <span className="text-primary-9 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-md ring-1 ring-black/5">
          <span className="mr-1 font-normal text-neutral-400">Population</span>
          {population.name}
        </span>
      )}
      <span className="whitespace-nowrap text-xs text-neutral-400">
        {population.nodeCount.toLocaleString()} {population.nodeCount === 1 ? 'cell' : 'cells'}{' '}
        recorded
      </span>
    </div>
  );
}

/** The node properties worth grouping by: categorical, with a manageable number of values. */
function groupingColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(
    (c) =>
      c.kind === 'categorical' &&
      (c.library?.length ?? 0) > 1 &&
      (c.library?.length ?? 0) <= MAX_GROUPS
  );
}

/** Mounts what it holds once it scrolls near view, then keeps it: a long list costs what is seen. */
function WhenNearView({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: '300px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);
  return (
    <div ref={ref} className={className}>
      {near ? children : null}
    </div>
  );
}
