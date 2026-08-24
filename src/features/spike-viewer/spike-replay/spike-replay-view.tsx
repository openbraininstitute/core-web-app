'use client';

import { RiBarChart2Line, RiBox3Line, RiLayoutRowLine } from '@remixicon/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { PopulationSelect } from '@/features/circuit-nodes/components/population-select';
import { useCircuitConfig } from '@/features/circuit-nodes/hooks/use-circuit-config';
import { isBiophysical } from '@/features/circuit-nodes/population-utils';
import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { PaneResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import { circuitDrawsMorphologies } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { ModeToggle } from '@/features/scan-config/components/color-by/mode-toggle';
import RasterPlot from '@/features/spike-viewer/components/raster-plot';
import RasterPlotControls from '@/features/spike-viewer/components/raster-plot-controls';
import { POPULATION_COLORS } from '@/features/spike-viewer/renderer/raster-renderer';
import { spikesToViewer } from '@/features/spike-viewer/spike-replay/spikes-to-viewer';
import { TransportBar } from '@/features/spike-viewer/spike-replay/transport-bar';
import { classNames } from '@/util/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodePopulation } from '@/features/circuit-nodes/types';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

const MODES = {
  Raster: 'raster',
  Replay: 'replay',
  Split: 'split',
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

/** Simulated milliseconds per wall-clock second: a 1 s recording plays in 10 s. */
const DEFAULT_SPEED = 100;
/** Wall-clock seconds for a spike to fade to `1/e`. */
const DEFAULT_AFTERGLOW_IN_SECONDS = 0.25;

/** Radius in pixels of a raster marker. */
const DEFAULT_MARKER_SIZE = 4;

/** How often the readout and scrubber catch up with the viewer's clock. */
const READOUT_INTERVAL_IN_MS = 100;

/**
 * The population is chosen above both panes, so the scene's own way of choosing
 * one — the nodes table — would be a second, contradicting control.
 */
const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false };

interface SpikeReplayViewProps {
  data: SpikeData;
  /** The circuit that produced the spikes; omit when there is none to replay over. */
  circuit?: ICircuit;
}

/**
 * A simulation's spikes as a raster, as a 3D replay over the circuit that
 * produced them, or both at once.
 *
 * Without a circuit — an ion-channel or single-cell campaign — only the raster
 * is on offer and the view pill drops away, but the population above it and the
 * layout under it stay exactly as they are here.
 *
 * The 3D scene mounts the first time it is asked for and stays mounted from
 * then on. Switching views must not tear down the WebGL context and re-download
 * every morphology — but that only means keeping it after the first look, not
 * building it for the majority who open a spike file and read the raster.
 */
export function SpikeReplayView({ data, circuit }: SpikeReplayViewProps) {
  const [mode, setMode] = useState<ReplayMode>(MODES.Raster);
  const [population, setPopulation] = useState<NodePopulation | undefined>();
  const [chosenPopulationName, setChosenPopulationName] = useState<string>();
  const [markerSize, setMarkerSize] = useState(DEFAULT_MARKER_SIZE);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [afterglowInSeconds, setAfterglowInSeconds] = useState(DEFAULT_AFTERGLOW_IN_SECONDS);
  const [seekToMs, setSeekToMs] = useState<number | undefined>();
  const [readoutTimeInMs, setReadoutTimeInMs] = useState(data.timeRange.min);
  const [rasterHeight, setRasterHeight] = useState<number | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<((timeInMs: number | null) => void) | null>(null);
  const liveTimeRef = useRef(data.timeRange.min);

  const { config: circuitConfig } = useCircuitConfig(circuit);
  const populations = useMemo(
    () => selectablePopulations(data, circuitConfig?.nodes),
    [data, circuitConfig]
  );
  // Derived rather than corrected in an effect: the list arrives with the
  // circuit config, and a name chosen against the file's own list before then
  // has to give way to it without a render in between showing neither.
  const populationName =
    populations.find((p) => p.name === chosenPopulationName)?.name ?? populations[0]?.name;
  const recordedIndex = data.populations.findIndex((p) => p.name === populationName);
  const recorded = recordedIndex < 0 ? undefined : data.populations[recordedIndex];

  // The scene resolves the name against the circuit's own config, and falls back
  // to a population of its own when it holds no such nodes. Replaying the
  // selection over those would look plausible and be wrong.
  const sceneOnSelection = population?.name === populationName;
  const spikes = useMemo(
    () => (sceneOnSelection ? spikesToViewer(data, populationName) : null),
    [data, populationName, sceneOnSelection]
  );
  const replayable = spikes !== null;
  const showScene = circuit !== undefined && mode !== MODES.Raster;
  const isSplit = mode === MODES.Split;
  const showRaster = !showScene || isSplit;
  const canSeek = isSplit && replayable;

  // Latches on: see the note above about what unmounting would cost.
  const [sceneMounted, setSceneMounted] = useState(false);
  useEffect(() => {
    if (showScene) setSceneMounted(true);
  }, [showScene]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The viewer owns the clock and reports it on every painted frame. Straight
  // into the raster's imperative renderer; React only samples it for the
  // readout, ten times a second rather than sixty.
  const handleTimeChange = useCallback((timeInMs: number) => {
    liveTimeRef.current = timeInMs;
    playheadRef.current?.(timeInMs);
  }, []);

  useEffect(() => {
    if (!playing) return;

    const interval = window.setInterval(
      () => setReadoutTimeInMs(liveTimeRef.current),
      READOUT_INTERVAL_IN_MS
    );
    // Cleanup settles on the exact frame playback stopped at, which the sampler
    // will have missed by up to its own interval.
    return () => {
      window.clearInterval(interval);
      setReadoutTimeInMs(liveTimeRef.current);
    };
  }, [playing]);

  // Clamped because the raster pads its initial view either side of the data,
  // so a click well inside the plot area can name a time the recording never
  // reached - which the transport would print and the 3D viewer, clamping
  // internally, would refuse to follow.
  const { min: timeMinInMs, max: timeMaxInMs } = data.timeRange;
  const handleSeek = useCallback(
    (rawTimeInMs: number) => {
      const timeInMs = Math.min(timeMaxInMs, Math.max(timeMinInMs, rawTimeInMs));
      setSeekToMs(timeInMs);
      setReadoutTimeInMs(timeInMs);
      liveTimeRef.current = timeInMs;
      playheadRef.current?.(timeInMs);
    },
    [timeMinInMs, timeMaxInMs]
  );

  // One-shot, so that seeking twice to the same millisecond still seeks: held,
  // the second Restart during playback would be no state change, hence no
  // re-seek, and the button would go dead. Children's effects run before this
  // one, so the seek always lands before it is cleared.
  useEffect(() => {
    if (seekToMs === undefined) return;
    setSeekToMs(undefined);
  }, [seekToMs]);

  // Nothing to animate for, and playing on would keep the render loop spinning
  // behind a pane nobody is looking at.
  useEffect(() => {
    if (mode === MODES.Raster || !replayable) setPlaying(false);
  }, [mode, replayable]);

  // The rule is otherwise only pushed by a painted frame, so entering the split
  // paused — which is every time, since leaving it stops playback — would show
  // a raster with no playhead on it. The child has attached by now.
  useEffect(() => {
    if (isSplit) playheadRef.current?.(liveTimeRef.current);
  }, [isSplit]);

  const modeOptions = circuit
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
      ]
    : [];

  const splitHeight = clampSplitHeight(rasterHeight, containerHeight);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center gap-3 px-3 pt-3">
        <ModeToggle options={modeOptions} />
        {populationName && (
          <div className="flex min-w-0 items-center gap-2">
            {recorded && (
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: POPULATION_COLORS[recordedIndex % POPULATION_COLORS.length] }}
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
              <span className="text-primary-9 text-sm font-semibold">
                <span className="mr-1 font-normal text-neutral-400">Population</span>
                {populationName}
              </span>
            )}
            {recorded && (
              <span className="whitespace-nowrap text-xs text-neutral-400">
                {recorded.timestamps.length.toLocaleString()} spikes
              </span>
            )}
          </div>
        )}
        {showScene && !replayable && (
          <span role="status" className="text-xs text-amber-600">
            {population
              ? `This circuit has no nodes for “${populationName}”, so there is nothing to replay these spikes over.`
              : 'Reading the circuit’s node populations…'}
          </span>
        )}
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1">
        {circuit && (
          <div
            className={classNames(
              'absolute left-0 right-0 top-0',
              !showScene && 'invisible pointer-events-none'
            )}
            style={{ bottom: isSplit ? splitHeight + SPLIT_GUTTER_IN_PX : 0 }}
            aria-hidden={!showScene}
            inert={!showScene || undefined}
          >
            {sceneMounted && (
              <CircuitScene
                circuit={circuit}
                largeCircuit={!circuitDrawsMorphologies(circuit.scale)}
                active={showScene}
                features={SCENE_FEATURES}
                populationName={populationName}
                onPopulationChange={setPopulation}
                spikes={{
                  data: spikes ?? undefined,
                  timeInMs: seekToMs,
                  onTimeChange: handleTimeChange,
                  playing,
                  onPlayingChange: setPlaying,
                  speed,
                  afterglowInSeconds,
                }}
              />
            )}
          </div>
        )}

        <div
          className={classNames(
            'absolute left-0 right-0 bottom-0 px-3 pb-3',
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
            <PaneResizeHandle
              containerRef={containerRef}
              minHeight={MIN_PANE_HEIGHT}
              onResize={setRasterHeight}
            />
          )}
          <div className="relative h-full min-h-0">
            <RasterPlot
              data={data}
              populationName={populationName}
              markerSize={markerSize}
              playheadRef={isSplit ? playheadRef : undefined}
              onSeek={canSeek ? handleSeek : undefined}
            />
            {/* Inside the pane it belongs to, the way the scene's chrome sits in
                its own: in the split these controls are the raster's alone, and
                the row above the panes is for what governs both. */}
            {recorded && recorded.timestamps.length > 0 && (
              <div className="absolute right-0 top-0 z-10">
                <RasterPlotControls
                  markerSize={markerSize}
                  onMarkerSizeChange={setMarkerSize}
                  canSeek={canSeek}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {showScene && (
        <TransportBar
          playing={playing}
          onPlayingChange={setPlaying}
          timeInMs={readoutTimeInMs}
          timeMinInMs={data.timeRange.min}
          timeMaxInMs={data.timeRange.max}
          onSeek={handleSeek}
          speed={speed}
          onSpeedChange={setSpeed}
          afterglowInSeconds={afterglowInSeconds}
          onAfterglowChange={setAfterglowInSeconds}
          disabled={!replayable}
        />
      )}
    </div>
  );
}

/**
 * The populations this viewer offers.
 *
 * Biophysical ones only: a spikes file records the virtual inputs beside the
 * cells that fired, and there is nothing worth watching in a population with no
 * cells behind it. Which is which is the circuit's business, so until its config
 * arrives — and on a file whose populations it lists none of, which is what an
 * input-spike recording looks like — the file's own list stands in rather than
 * leaving the viewer with nothing to show.
 */
function selectablePopulations(
  data: SpikeData,
  nodes: NodePopulation[] | undefined
): { name: string; type?: string }[] {
  const recorded = (population: { name: string }) =>
    data.populations.some((p) => p.name === population.name);

  const fromCircuit = (nodes ?? []).filter(isBiophysical).filter(recorded);
  if (fromCircuit.length > 0) return fromCircuit;

  return data.populations.map((p) => ({ name: p.name }));
}

/**
 * Keep both panes usable however far the divider is dragged.
 *
 * These are box heights, and each pane spends {@link SPLIT_GUTTER_IN_PX} of its
 * own on clearance, so the floor is the minimum plus a gutter.
 */
function clampSplitHeight(rasterHeight: number | null, containerHeight: number): number {
  const preferred = rasterHeight ?? Math.round(containerHeight * DEFAULT_RASTER_HEIGHT_RATIO);
  const floor = MIN_PANE_HEIGHT + SPLIT_GUTTER_IN_PX;
  if (containerHeight <= floor * 2) return Math.round(containerHeight / 2);
  return Math.min(containerHeight - floor, Math.max(floor, preferred));
}
