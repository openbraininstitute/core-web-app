'use client';

import { RiBarChart2Line, RiBox3Line, RiLayoutRowLine, RiTableLine } from '@remixicon/react';
import { atom, useAtom } from 'jotai';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { PopulationSelect } from '@/features/circuit-nodes/components/population-select';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { nodesSessionKey, useNodesWorker } from '@/features/circuit-nodes/hooks/use-nodes-worker';
import { hasPositions } from '@/features/circuit-nodes/population-utils';
import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import {
  PaneResizeHandle,
  ShutPaneBar,
  useShuttingSplit,
} from '@/features/circuit-viewer/pane-resize-handle';
import { DEFAULT_SPIKE_GLOW } from '@/features/circuit-viewer/spike-clock';
import { useCircuitDrawsEachCell } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { FullscreenButton } from '@/features/scan-config/components/color-by/chrome-button';
import { ModeToggle } from '@/features/scan-config/components/color-by/mode-toggle';
import { useResultsSidePanel } from '@/features/scan-config/components/shared/results-layout';
import { CollapsingControls } from '@/features/spike-viewer/components/collapsing-controls';
import RasterPlot from '@/features/spike-viewer/components/raster-plot';
import RasterPlotControls, {
  RasterHelp,
} from '@/features/spike-viewer/components/raster-plot-controls';
import { SceneTime } from '@/features/spike-viewer/components/scene-time';
import { useCellFocus } from '@/features/spike-viewer/hooks/use-cell-focus';
import { useRasterWindow } from '@/features/spike-viewer/hooks/use-raster-window';
import { useReplayClock } from '@/features/spike-viewer/hooks/use-replay-clock';
import { useKeptSpikes, useViewerSpikes } from '@/features/spike-viewer/hooks/use-session-spikes';
import { useSpikeSession } from '@/features/spike-viewer/hooks/use-spike-session';
import { useRasterOrder } from '@/features/spike-viewer/raster-order';
import { POPULATION_COLORS } from '@/features/spike-viewer/renderer/raster-renderer';
import { useReportPopulation } from '@/features/spike-viewer/report-populations';
import { useSimulation } from '@/features/spike-viewer/simulation-context';
import {
  listedCellPopulation,
  rasterOnlyNote,
  rasterOnlyReason,
  replayNotice,
} from '@/features/spike-viewer/spike-replay/replay-notice';
import {
  TimeWindowFields,
  WindowResetButton,
} from '@/features/spike-viewer/spike-replay/time-window-fields';
import { SPEEDS, TransportBar } from '@/features/spike-viewer/spike-replay/transport-bar';
import { SpikeStatisticsView } from '@/features/spike-viewer/spike-statistics/spike-statistics-view';
import {
  OpenPanelButton,
  PANEL_FLOORS,
  StackedPanes,
} from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { SPIKE_STATISTICS } from '@/features/spike-viewer/spike-statistics/statistics';
import { withKeptSpikes } from '@/features/spike-viewer/spike-trace';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { spikeReplayTour, useNextStepOnboarding } from '@/ui/segments/app-setup/discover-app';
import { classNames } from '@/util/utils';
import { FullscreenPortalScope, useFullscreenElement } from '@/utils/fullscreen';

import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { TSceneSubject } from '@/features/circuit-viewer/circuit-scene';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { SpikeSession } from '@/features/spike-viewer/hooks/use-spike-session';
import type { TimeAxis } from '@/features/spike-viewer/renderer/raster-renderer';
import type { Notice } from '@/features/spike-viewer/spike-replay/replay-notice';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

const MODES = {
  Raster: 'raster',
  Replay: 'replay',
  Split: 'split',
  Statistics: 'statistics',
} as const;
type ReplayMode = (typeof MODES)[keyof typeof MODES];

const MIN_PANE_HEIGHT = 200;
const DEFAULT_RASTER_HEIGHT_RATIO = 0.4;

/**
 * Clear space each pane keeps on its side of the divider.
 *
 * Both panes fill their box, so without it the scale bar above and the
 * population line below run right into the grab bar and read as chrome
 * belonging to it rather than as two separate views.
 */
const SPLIT_GUTTER_IN_PX = 12;
/**
 * What each pane keeps of the split, its gutter included. In a panel too short
 * for two of them the bounds cross, and the divider stays live between them.
 */
const PANE_FLOOR = MIN_PANE_HEIGHT + SPLIT_GUTTER_IN_PX;
/** The raster pane's height as last dragged: kept for the next file, as a pick from the bar mounts it anew. */
const rasterHeightAtom = atom<number | null>(null);

/** Radius in pixels of a raster marker. */
const DEFAULT_MARKER_SIZE = 4;

/**
 * The population is chosen above both panes, so the scene's own way of choosing
 * one — the nodes table — would be a second, contradicting control.
 */
const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false };

interface SpikeReplayViewProps {
  data: SpikeData;
  /** The circuit or MEModel to replay the spikes over; omit when there is none. */
  subject?: TSceneSubject;
  /** The report's path, by which the campaign's other simulations' copies are found. */
  reportPath?: string;
  /**
   * The worker that parsed `data` and holds a copy of it, to cut and count the
   * spikes off this thread. Omit it to have the view start one of its own.
   */
  session?: SpikeSession | null;
}

/**
 * A simulation's spikes as a raster, as a 3D replay over the circuit or MEModel
 * that produced them, or both at once.
 *
 * Without a subject the view pill drops away and the raster has the panel to
 * itself: the split's divider and gutter would frame a pane that never holds
 * anything.
 *
 * The 3D scene mounts the first time it is asked for and stays mounted from
 * then on, so switching views never tears down the WebGL context and
 * re-downloads every morphology. Without a subject it never mounts at all.
 */
export function SpikeReplayView({ data, subject, reportPath, session }: SpikeReplayViewProps) {
  const { timeline } = useSimulation();
  // Every pass over the spikes - the cells on show, the replay's arrays, the
  // statistics - is the file's worker's, so none of them holds up the page.
  const ownSession = useSpikeSession(session === undefined ? data : null);
  const spikeSession = session ?? ownSession;
  const [mode, setMode] = useState<ReplayMode>(MODES.Split);
  const [markerSize, setMarkerSize] = useState(DEFAULT_MARKER_SIZE);
  const [glow, setGlow] = useState(DEFAULT_SPIKE_GLOW);
  const [rasterHeight, setRasterHeight] = useAtom(rasterHeightAtom);
  const [containerHeight, setContainerHeight] = useState(0);

  // State, not a ref: the button and the portal scope read it while rendering.
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const circuit = subject?.circuit;
  const memodel = subject?.memodel;
  const drawsEachCellOf = useCircuitDrawsEachCell();
  const {
    config: circuitConfig,
    isLoading: configLoading,
    error: configError,
  } = useCircuitConfig(circuit);

  // Every recorded population is on offer — input (virtual) spikes included,
  // since the raster can always plot them. Which of them the 3D replay can
  // light up is a separate question, answered below rather than by hiding
  // the rest of the list.
  const populations = useMemo(
    () =>
      data.populations.map((p) => ({
        name: p.name,
        type: circuitConfig?.nodes.find((n) => n.name === p.name)?.type,
      })),
    [data, circuitConfig]
  );
  // Derived rather than corrected in an effect: the default may move when the
  // circuit config arrives and names a population of cells, and the name on
  // show has to give way to it without a render in between showing neither.
  // The choice is the report's, shared with the picker over the statistics.
  // Input populations can be replayed too, but only once picked: the circuit's
  // own cells are what a simulation is opened to see.
  const populationNames = useMemo(() => populations.map((p) => p.name), [populations]);
  const [populationName, setChosenPopulationName] = useReportPopulation(
    reportPath,
    populationNames,
    populations.find((p) => listedCellPopulation(circuitConfig?.nodes, p.name))?.name ??
      populations[0]?.name
  );
  const recordedIndex = data.populations.findIndex((p) => p.name === populationName);
  const recorded = recordedIndex < 0 ? undefined : data.populations[recordedIndex];

  // The spike file holds the cells that fired and says nothing about the rest,
  // so the axis span comes from the node file. This is the session the scene
  // and the nodes table share, so in the split it is already open.
  const listed = circuitConfig?.nodes.find((n) => n.name === populationName);
  const {
    rowCount,
    status: nodesStatus,
    columns: nodeColumns,
  } = useNodesWorker({
    enabled: circuit !== undefined,
    circuitId: circuit?.id ?? '',
    circuitAssetId: circuitConfig?.circuitAssetId ?? '',
    population: listed,
  });
  const nodesSession =
    circuit && listed
      ? nodesSessionKey(circuit.id, circuitConfig?.circuitAssetId ?? '', listed.name)
      : '';
  const countedCells = nodesStatus === 'ready' ? rowCount : undefined;
  // A hovered spike's cell, as the table has it: the file's columns and the statistics it pins.
  const cellRows = useMemo(
    () =>
      nodesSession
        ? { session: nodesSession, columns: nodeColumns, statistics: SPIKE_STATISTICS }
        : undefined,
    [nodesSession, nodeColumns]
  );
  // An MEModel is one cell drawn from the model itself, with no node file.
  const cellCount = memodel === undefined ? countedCells : 1;
  const rasterOrder = useRasterOrder({
    circuit,
    circuitConfig,
    populationName,
    cellCount,
    spikes: spikeSession,
    timeRange: data.timeRange,
  });

  // Read off the same nodes session. Unknown until it is ready, and replayed in
  // the meantime: switching population mid-play should not pause on a download.
  const positioned = nodesStatus === 'ready' && nodeColumns ? hasPositions(nodeColumns) : undefined;
  // The per-cell viewer cannot light an input population yet: it draws one as
  // a cloud of somas with no brightness of their own.
  const drawsEachCell = circuit !== undefined && drawsEachCellOf(circuit);
  // Where the 3D view has nothing to show for these spikes at all, it drops
  // away and the raster has the panel, the way it does with no subject.
  const rasterOnly =
    recorded === undefined
      ? undefined
      : rasterOnlyReason(listed, nodesStatus === 'error', positioned, drawsEachCell);
  const offers3D = !!subject && rasterOnly === undefined;

  // Decided against the host's own copy of the circuit config — the same
  // query the scene resolves against — so the answer never lags the scene by
  // a render: switching populations mid-play used to trip the pause effect
  // below on exactly that lag. A population the config does not list has no
  // cells to light; the scene then draws its own default and the notice in the
  // header says why.
  //
  // Nothing recorded is nothing to replay. Past that, an MEModel is drawn from
  // the model itself and has one cell, so there is no config to ask.
  const replayable =
    recorded !== undefined &&
    (memodel !== undefined || (listed !== undefined && rasterOnly === undefined));
  // The statistics are listed against the node file, which only a circuit has.
  const statisticsAvailable = circuit !== undefined;
  // Inside a results layout the statistics open beside the viewer: everything
  // moves left a page and they come in where it was, so the raster and the
  // replay stay in view beside them. Anywhere else - or in full screen, where
  // nothing outside the viewer shows - they take the viewer's own panel as a
  // fourth view. Docked from the first render, before the layout's panel is
  // there to portal into: else the scene would be built for a view not up.
  const sidePanel = useResultsSidePanel();
  const fullscreenElement = useFullscreenElement();
  const docked =
    statisticsAvailable && sidePanel !== null && (root === null || fullscreenElement !== root);
  // The scene's colour-by control, raised into the header row beside the
  // population, and its mapping, which the raster draws its spikes in too
  // while the scene and its key are on show beside it.
  const [colorBySlot, setColorBySlot] = useState<HTMLDivElement | null>(null);
  const [sceneColors, setSceneColors] = useState<{
    population: string;
    nodeColors: NodeColors;
  } | null>(null);
  // Up or not is the layout's: it outlasts this file when another result is
  // picked from the bar over the panel, and the next file's statistics take over.
  const dockedOpen = docked && (sidePanel?.open ?? false);
  // Docked, the raster is over the table, and the panel beside them, once up,
  // holds the 3D player over the statistics. Either column can be shut on its
  // side by the rule between them, and any of the four panes by its own bar.
  const shuts = sidePanel?.shuts;
  const rasterUp = !(dockedOpen && shuts?.columns === 'start') && shuts?.file !== 'start';
  const sceneUp = dockedOpen && shuts?.columns !== 'end' && shuts?.panel !== 'start';
  const plotsUp = dockedOpen && shuts?.columns !== 'end' && shuts?.panel !== 'end';
  // The split of the viewer's own panes, out of a results layout.
  const panes = useShuttingSplit({
    chosen: rasterHeight,
    onChosenChange: setRasterHeight,
    shut: null,
    total: containerHeight,
    floors: [PANE_FLOOR, PANE_FLOOR],
    preferred: Math.round(containerHeight * DEFAULT_RASTER_HEIGHT_RATIO),
  });

  // With nothing to replay over the raster is the only view, whatever the mode
  // says: a split would show an empty pane and a playhead nothing can move.
  // The mode itself is kept, for when another population brings the 3D back.
  // Docked it is whichever of the raster and the scene are up.
  const view = docked
    ? sceneUp && offers3D
      ? rasterUp
        ? MODES.Split
        : MODES.Replay
      : MODES.Raster
    : offers3D
      ? mode
      : MODES.Raster;
  const showStatistics = !docked && view === MODES.Statistics && statisticsAvailable;

  // While the statistics are up, their table narrows the raster and the replay
  // to the cells it ticks, else to those its filter keeps: one flag per cell of
  // the node file, which the spikes are cut by and the scene draws by.
  const [tableCells, setTableCells] = useState<{ population: string; cells: Uint32Array | null }>();
  const handleShownCells = useCallback(
    (cells: Uint32Array | null) => {
      if (populationName) setTableCells({ population: populationName, cells });
    },
    [populationName]
  );
  const filteredCells =
    (docked || showStatistics) && tableCells?.population === populationName
      ? tableCells.cells
      : null;
  const shownCells = useMemo(() => {
    if (!filteredCells || cellCount === undefined) return undefined;
    const flags = new Uint8Array(cellCount);
    for (const cell of filteredCells) if (cell < cellCount) flags[cell] = 1;
    return flags;
  }, [filteredCells, cellCount]);
  // The raster's spikes, cut to those cells by the worker; all of them until it has.
  const shownSpikes = useKeptSpikes(spikeSession, populationName, shownCells ?? null);
  const shownData = useMemo(
    () =>
      shownSpikes && populationName ? withKeptSpikes(data, populationName, shownSpikes) : data,
    [data, populationName, shownSpikes]
  );

  // What the raster is zoomed to, once it rests: the statistics are over its
  // span of time and the cells of its rows, and the scene keeps only those.
  const {
    currentWindow,
    windowCells,
    handleWindowChange,
    windowResetKey,
    clearRasterWindow,
    timeWindowRequest,
    requestTimeWindow,
  } = useRasterWindow({ populationName, cellCount, rowOrder: rasterOrder.order });
  const sceneCells = useMemo(() => {
    if (!windowCells) return shownCells;
    if (!shownCells) return windowCells;
    const flags = new Uint8Array(windowCells.length);
    for (let i = 0; i < flags.length; i++) flags[i] = windowCells[i] & shownCells[i];
    return flags;
  }, [windowCells, shownCells]);
  // The table row under the pointer, else the cell clicked in the scene or the
  // raster: pointed out in both, and found in the table.
  const {
    handleHoveredCell,
    handleCellClick,
    handleScenePointerDown,
    handleScenePointerUp,
    focusedCell,
    highlightedCell,
    releaseCell,
  } = useCellFocus({ populationName, tableShown: docked || showStatistics });

  // What the scene is narrowed to, said over it with the way back to every
  // cell: the cell clicked, else those the table and the raster's window keep.
  const [resetRequest, setResetRequest] = useState(0);
  const selectedCount = useMemo(() => {
    if (focusedCell) return 1;
    if (!sceneCells) return null;
    let n = 0;
    for (const flag of sceneCells) n += flag;
    return n;
  }, [focusedCell, sceneCells]);
  const sceneSelection =
    selectedCount !== null && cellCount !== undefined
      ? {
          count: selectedCount,
          total: cellCount,
          onReset: () => {
            releaseCell();
            clearRasterWindow();
            // The table's own reset: its filters and ticks, and the raster's window.
            setResetRequest((n) => n + 1);
          },
        }
      : undefined;
  const shownSpikeCount =
    recordedIndex < 0 ? 0 : (shownData.populations[recordedIndex]?.timestamps.length ?? 0);
  const spikes = useViewerSpikes(
    spikeSession,
    replayable ? populationName : undefined,
    sceneCells,
    data.timeRange
  );
  const showScene = view === MODES.Replay || view === MODES.Split;
  const isSplit = view === MODES.Split;
  const showRaster = isSplit || (!showScene && !showStatistics);
  // In the split, the scrubber lies under the raster's time axis, and the
  // replay's speed sits with the raster's own controls.
  const [timeAxis, setTimeAxis] = useState<TimeAxis | null>(null);

  // Waits for a replay that works, so the last step never points at a disabled play button.
  // Its steps are the viewer's own views, which docked are panes of the layout's.
  useNextStepOnboarding({
    condition: replayable && showScene && !docked,
    tour: spikeReplayTour,
  });

  // Latches on: see the note above about what unmounting would cost. Not while
  // the layout slides: building the scene would stall the slide.
  const sliding = sidePanel?.sliding ?? false;
  const [sceneMounted, setSceneMounted] = useState(false);
  useEffect(() => {
    if (showScene && !sliding) setSceneMounted(true);
  }, [showScene, sliding]);

  // The same latch, so closing the statistics and opening them again keeps the
  // table's sort and filters, and its plot.
  const [statisticsMounted, setStatisticsMounted] = useState(false);
  useEffect(() => {
    if (showStatistics || docked) setStatisticsMounted(true);
  }, [showStatistics, docked]);

  // A layout effect, seeded by hand: the observer's first report only lands a
  // frame after `observe`, and the split would size its raster pane off a
  // zero height for that first paint.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setContainerHeight(el.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A raster zoomed to a span of time plays that span.
  const {
    playing,
    setPlaying,
    handlePlayingChange,
    speed,
    setSpeed,
    afterglowInSeconds,
    setAfterglowInSeconds,
    seekToMs,
    readoutTimeInMs,
    liveTimeRef,
    playheadRef,
    scrubberRef,
    sceneTime,
    playheadCursor,
    handleTimeChange,
    handleSeek,
  } = useReplayClock({
    timeRange: data.timeRange,
    playFrom: currentWindow?.time?.[0] ?? data.timeRange.min,
    playTo: currentWindow?.time?.[1] ?? data.timeRange.max,
  });

  // Nothing to animate for, and playing on would keep the render loop spinning
  // behind a pane nobody is looking at.
  useEffect(() => {
    if (view === MODES.Raster || view === MODES.Statistics || !replayable) setPlaying(false);
  }, [view, replayable, setPlaying]);

  // The rule is otherwise only pushed by a painted frame, so entering the split
  // paused — which is every time, since leaving it stops playback — would show
  // a raster with no playhead on it. The child has attached by now.
  useEffect(() => {
    if (isSplit) playheadRef.current?.(liveTimeRef.current);
  }, [isSplit, playheadRef, liveTimeRef]);

  const modeOptions = offers3D
    ? [
        {
          label: 'Raster plot',
          icon: <RiBarChart2Line className="size-4" />,
          active: mode === MODES.Raster,
          onSelect: () => setMode(MODES.Raster),
        },
        {
          label: '3D spike replay',
          icon: <RiBox3Line className="size-4" />,
          active: mode === MODES.Replay,
          onSelect: () => setMode(MODES.Replay),
        },
        {
          label: 'Raster and replay',
          icon: <RiLayoutRowLine className="size-4" />,
          active: mode === MODES.Split,
          onSelect: () => setMode(MODES.Split),
        },
        // docked, the statistics are a panel beside the views rather than one of them
        ...(statisticsAvailable && !docked
          ? [
              {
                label: 'Spike statistics',
                icon: <RiTableLine className="size-4" />,
                active: mode === MODES.Statistics,
                onSelect: () => setMode(MODES.Statistics),
              },
            ]
          : []),
      ]
    : [];

  const splitHeight = panes.size;

  // Docked, the panel's statistics box holds the plots, which the statistics
  // view beside the raster portals in, so the two share one tree.
  const [plotsSlot, setPlotsSlot] = useState<HTMLDivElement | null>(null);

  // One element for wherever the statistics go: under the raster, or the viewer's own panel.
  const statistics =
    circuit && statisticsMounted ? (
      <SpikeStatisticsView
        circuit={circuit}
        circuitConfig={circuitConfig}
        populationName={populationName}
        spikes={spikeSession}
        onShownCellsChange={handleShownCells}
        onHoveredCellChange={handleHoveredCell}
        focusedCell={docked ? (focusedCell ?? undefined) : undefined}
        windowTime={currentWindow?.time ?? null}
        windowCells={windowCells}
        onClearWindow={clearRasterWindow}
        resetRequest={resetRequest}
        heldCell={focusedCell?.nodeId ?? null}
        timeRange={data.timeRange}
        color={POPULATION_COLORS[Math.max(0, recordedIndex) % POPULATION_COLORS.length]}
        tableOnly={docked ? !plotsUp || sliding : false}
        plotsTarget={docked ? plotsSlot : undefined}
        events={timeline}
        timeCursor={playheadCursor}
      />
    ) : null;

  // Play and the scrubber: under the panes, in the raster's box under its
  // axis, or with the raster out of view, in the scene's.
  const transport = (boxed: boolean) => (
    <TransportBar
      playing={playing}
      onPlayingChange={handlePlayingChange}
      axis={isSplit ? timeAxis : null}
      clock={{ timeRef: liveTimeRef, moveRef: scrubberRef }}
      timeInMs={readoutTimeInMs}
      timeMinInMs={data.timeRange.min}
      timeMaxInMs={data.timeRange.max}
      onSeek={handleSeek}
      speed={speed}
      onSpeedChange={setSpeed}
      disabled={!replayable}
      boxed={boxed}
    />
  );

  const spikeCount = recorded && (
    <span className="whitespace-nowrap text-xs text-neutral-400">
      {shownCells && `${shownSpikeCount.toLocaleString()} of `}
      {recorded.timestamps.length.toLocaleString()} spikes
    </span>
  );

  const population = populationName && (
    <div className="flex min-w-0 items-center gap-2">
      {recorded && (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{
            background: POPULATION_COLORS[recordedIndex % POPULATION_COLORS.length],
          }}
        />
      )}
      {populations.length > 1 ? (
        <PopulationSelect
          variant="chrome"
          populations={populations}
          value={populationName}
          onChange={setChosenPopulationName}
        />
      ) : (
        <span className="text-primary-9 min-w-0 truncate text-sm font-semibold">
          <span className="mr-1 font-normal text-neutral-400">Population</span>
          {populationName}
        </span>
      )}
      {/* Beside the raster's help while the raster is on show. */}
      {!showRaster && spikeCount}
    </div>
  );

  let note: Notice | undefined;
  if (rasterOnly !== undefined) note = rasterOnlyNote(rasterOnly, populationName);
  else if (showScene && !replayable)
    note = {
      text: replayNotice(recorded, populationName, configLoading, configError !== null),
      warning: true,
    };
  const notice = note && (
    <span
      role="status"
      className={classNames('text-xs', note.warning ? 'text-amber-600' : 'text-neutral-500')}
    >
      {note.text}
    </span>
  );

  const raster = (
    <div className="relative min-h-0 flex-1">
      <RasterPlot
        data={shownData}
        cellColors={
          showScene && sceneColors?.population === populationName
            ? sceneColors.nodeColors
            : undefined
        }
        populationName={populationName}
        cellCount={cellCount}
        markerSize={markerSize}
        playheadRef={isSplit ? playheadRef : undefined}
        rowOrder={rasterOrder.order}
        highlightedCell={highlightedCell}
        onCellClick={circuit ? handleCellClick : undefined}
        onWindowChange={handleWindowChange}
        windowResetKey={windowResetKey}
        onTimeAxisChange={setTimeAxis}
        timeWindowRequest={timeWindowRequest}
        events={timeline}
        cellRows={cellRows}
      />
      {/* Inside the pane it belongs to, the way the scene's chrome sits in
      its own: in the split these controls are the raster's alone, and
      the row above the panes is for what governs both. */}
      {recorded && recorded.timestamps.length > 0 && (
        <CollapsingControls
          trailing={
            <>
              {spikeCount}
              <RasterHelp />
            </>
          }
        >
          <RasterPlotControls markerSize={markerSize} onMarkerSizeChange={setMarkerSize} />
          {circuit && (
            <PillSelect
              label="Order by"
              value={rasterOrder.value}
              options={rasterOrder.options}
              onChange={rasterOrder.onChange}
            />
          )}
          {isSplit && replayable && (
            <PillSelect
              label="Speed"
              value={String(speed)}
              options={SPEEDS.map((s) => ({ value: String(s.value), label: s.label }))}
              onChange={(v) => setSpeed(Number(v))}
            />
          )}
          <TimeWindowFields
            from={currentWindow?.time?.[0] ?? data.timeRange.min}
            to={currentWindow?.time?.[1] ?? data.timeRange.max}
            min={data.timeRange.min}
            max={data.timeRange.max}
            onChange={requestTimeWindow}
          />
          <WindowResetButton
            zoomed={currentWindow !== null}
            title="Back to the whole run and every cell"
            onReset={clearRasterWindow}
          />
        </CollapsingControls>
      )}
    </div>
  );

  // The scene's colour-by is in its corner docked, else in the header row.
  const scene = sceneMounted && subject && (
    <CircuitScene
      {...subject}
      largeCircuit={circuit !== undefined && !drawsEachCell}
      active={showScene}
      features={SCENE_FEATURES}
      // Only a name the config backs with cells. A name the scene
      // cannot draw would make it fall back on its own — with no name
      // it falls back deliberately, to the same default, and the
      // notice in the header explains what is on show. An MEModel
      // resolves no populations, so the name means nothing to it.
      populationName={replayable ? populationName : undefined}
      // The population above the panes is the one being replayed,
      // and the spikes' cell indices are relative to it. The
      // circuit's other populations are not drawn here.
      showUnselectedPopulations={false}
      colorByTarget={docked ? undefined : colorBySlot}
      // It colours the raster too, where every spike in one colour is uniform.
      colorByNoneLabel="Uniform"
      shownCells={sceneCells}
      highlightedCell={highlightedCell ?? undefined}
      selection={sceneSelection}
      onCellClick={handleCellClick}
      onNodeColorsChange={setSceneColors}
      spikes={{
        data: spikes ?? undefined,
        timeInMs: seekToMs,
        onTimeChange: handleTimeChange,
        playing,
        onPlayingChange: setPlaying,
        speed,
        afterglowInSeconds,
        onAfterglowChange: setAfterglowInSeconds,
        glow,
        onGlowChange: setGlow,
      }}
    />
  );

  if (docked && sidePanel) {
    const panelTitles = ['3D Player', 'Statistics'];
    return (
      <div ref={setRoot} className="flex h-full min-h-0 flex-col">
        <FullscreenPortalScope root={root}>
          {/* The raster over the table, and while the panel is not up a button over them opening it. */}
          <StackedPanes
            split="file"
            header={
              !dockedOpen && (
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  {population}
                  <div className="ml-auto">
                    <OpenPanelButton titles={panelTitles} onOpen={() => sidePanel.setOpen(true)} />
                  </div>
                </div>
              )
            }
            top={{
              title: 'Raster',
              keepsSize: true,
              boxClassName: 'px-3 pt-2',
              content: (
                <>
                  {raster}
                  {/* The scrubber is under the raster's axis while the scene is up beside it. */}
                  {isSplit && transport(true)}
                </>
              ),
            }}
            bottom={
              statistics && {
                title: 'Neuron Table',
                boxClassName: 'px-3 pt-1 pb-2',
                content: statistics,
              }
            }
          />
          {/* The panel beside them: the 3D player over the statistics. */}
          {sidePanel.target &&
            createPortal(
              <StackedPanes
                split="panel"
                floors={PANEL_FLOORS}
                top={{
                  title: '3D Player',
                  keepsSize: true,
                  boxClassName: 'overflow-hidden',
                  content: (
                    <div
                      id="spike-replay-scene"
                      className="relative flex min-h-0 flex-1 flex-col"
                      onPointerDownCapture={handleScenePointerDown}
                      onPointerUpCapture={handleScenePointerUp}
                    >
                      <div className="relative min-h-0 flex-1">
                        {scene}
                        {replayable && (
                          <SceneTime
                            labelRef={sceneTime.ref}
                            playing={playing}
                            onPlayingChange={handlePlayingChange}
                          />
                        )}
                        {notice && (
                          <div className="pointer-events-none absolute top-3 left-14 right-3 z-10">
                            {notice}
                          </div>
                        )}
                      </div>
                      {/* With the raster out of view, play and the scrubber are the scene's. */}
                      {showScene && !isSplit && transport(true)}
                    </div>
                  ),
                }}
                bottom={{
                  title: 'Statistics',
                  content: <div ref={setPlotsSlot} className="flex h-full min-h-0 flex-col" />,
                }}
              />,
              sidePanel.target
            )}
          {/* With the rule shut over either column, one bar naming its panes, in the strip it leaves */}
          {sidePanel.fileStrip &&
            createPortal(
              <ShutPaneBar
                upright
                title={['Raster', 'Neuron Table']}
                onOpen={sidePanel.openColumns}
              />,
              sidePanel.fileStrip
            )}
          {sidePanel.panelStrip &&
            createPortal(
              <ShutPaneBar upright title={panelTitles} onOpen={sidePanel.openColumns} />,
              sidePanel.panelStrip
            )}
        </FullscreenPortalScope>
      </div>
    );
  }

  return (
    // This root goes fullscreen, not the 3D pane inside it, so the raster and
    // transport bar go with it; the scene is handed no fullscreen button of its own.
    <div ref={setRoot} className="flex h-full min-h-0 flex-col [&:fullscreen]:bg-white">
      <FullscreenPortalScope root={root}>
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pt-3">
          {subject && (
            <div className="flex items-center gap-2">
              <ModeToggle id="spike-replay-mode-toggle" options={modeOptions} />
              <FullscreenButton target={root} />
            </div>
          )}
          {population}
          {notice}
          {subject && (
            <div
              ref={setColorBySlot}
              className={classNames('ml-auto flex shrink-0 items-center', !showScene && 'hidden')}
            />
          )}
        </div>

        <div ref={containerRef} className="relative min-h-0 flex-1">
          {subject && (
            <div
              id="spike-replay-scene"
              className={classNames(
                'absolute left-0 right-0 top-0',
                !showScene && 'invisible pointer-events-none'
              )}
              style={{ bottom: isSplit ? splitHeight + SPLIT_GUTTER_IN_PX : 0 }}
              aria-hidden={!showScene}
              inert={!showScene || undefined}
              onPointerDownCapture={handleScenePointerDown}
              onPointerUpCapture={handleScenePointerUp}
            >
              {scene}
              {replayable && (
                <SceneTime
                  labelRef={sceneTime.ref}
                  playing={playing}
                  onPlayingChange={handlePlayingChange}
                />
              )}
            </div>
          )}

          <div
            className={classNames(
              // A margin rather than padding, so the rule below stops short of
              // the panel's edges: full-bleed it reads as a section break, and
              // the header above it as chrome belonging to the 3D pane alone.
              'absolute left-0 right-0 bottom-0 mx-3 pb-3',
              // Two white panes meet along this edge, so without a rule they read
              // as one view with a gap in it. The grab bar rides on top of it.
              isSplit && 'border-t border-neutral-2',
              !showRaster && 'invisible pointer-events-none'
            )}
            style={isSplit ? { height: splitHeight, paddingTop: SPLIT_GUTTER_IN_PX } : { top: 0 }}
            aria-hidden={!showRaster}
            inert={!showRaster || undefined}
          >
            {isSplit && (
              // The floor lives in the split, which knows when the panel is too
              // short to honour it. A floor here as well would stop the drag at
              // exactly the heights where the split relents.
              <PaneResizeHandle
                containerRef={containerRef}
                minHeight={0}
                onResize={panes.onResize}
              />
            )}
            <div className="flex h-full min-h-0 flex-col">{raster}</div>
          </div>

          {statistics && (
            <div
              className={classNames(
                'absolute inset-0',
                !showStatistics && 'invisible pointer-events-none'
              )}
              aria-hidden={!showStatistics}
              inert={!showStatistics || undefined}
            >
              {statistics}
            </div>
          )}
        </div>

        {showScene && transport(false)}
      </FullscreenPortalScope>
    </div>
  );
}
