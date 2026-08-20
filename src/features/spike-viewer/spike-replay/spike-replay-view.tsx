'use client';

import { RiBarChart2Line, RiBox3Line, RiLayoutRowLine } from '@remixicon/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { PaneResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import { ModeToggle } from '@/features/scan-config/components/color-by/mode-toggle';
import RasterPlot from '@/features/spike-viewer/components/raster-plot';
import { spikesToViewer } from '@/features/spike-viewer/spike-replay/spikes-to-viewer';
import { TransportBar } from '@/features/spike-viewer/spike-replay/transport-bar';
import { classNames } from '@/util/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
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

/** Simulated milliseconds per wall-clock second: a 1 s recording plays in 10 s. */
const DEFAULT_SPEED = 100;
/** Wall-clock seconds for a spike to fade to `1/e`. */
const DEFAULT_AFTERGLOW_IN_SECONDS = 0.35;

/** How often the readout and scrubber catch up with the viewer's clock. */
const READOUT_INTERVAL_IN_MS = 100;

interface SpikeReplayViewProps {
  data: SpikeData;
  circuit: ICircuit;
}

/**
 * A simulation's spikes as a raster, as a 3D replay over the circuit that
 * produced them, or both at once.
 *
 * Both panes stay mounted in every mode. Switching views must not tear down the
 * WebGL context and re-download every morphology, which is what unmounting the
 * 3D scene would cost.
 */
export function SpikeReplayView({ data, circuit }: SpikeReplayViewProps) {
  const [mode, setMode] = useState<ReplayMode>(MODES.Raster);
  const [population, setPopulation] = useState<NodePopulation | undefined>();
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

  const spikes = useMemo(() => spikesToViewer(data, population?.name), [data, population]);
  const replayable = spikes !== null;

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
    return () => window.clearInterval(interval);
  }, [playing]);

  // Settling on the exact frame playback stopped at, which the sampler above
  // will have missed by up to its own interval.
  useEffect(() => {
    if (playing) return;
    setReadoutTimeInMs(liveTimeRef.current);
  }, [playing]);

  const handleSeek = useCallback((timeInMs: number) => {
    setSeekToMs(timeInMs);
    setReadoutTimeInMs(timeInMs);
    liveTimeRef.current = timeInMs;
    playheadRef.current?.(timeInMs);
  }, []);

  // One-shot: the viewer has moved on by the time this clears, and holding the
  // value would re-seek it on the next unrelated render. Children's effects run
  // before this one, so the seek always lands first.
  useEffect(() => {
    if (seekToMs === undefined) return;
    setSeekToMs(undefined);
  }, [seekToMs]);

  // Nothing to animate for, and playing on would keep the render loop spinning
  // behind a pane nobody is looking at.
  useEffect(() => {
    if (mode === MODES.Raster || !replayable) setPlaying(false);
  }, [mode, replayable]);

  const modeOptions = useMemo(
    () => [
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
    ],
    [mode]
  );

  const showScene = mode !== MODES.Raster;
  const showRaster = mode !== MODES.Replay;
  const splitHeight = clampSplitHeight(rasterHeight, containerHeight);

  const spikeBinding = useMemo(
    () => ({
      data: spikes ?? undefined,
      timeInMs: seekToMs,
      onTimeChange: handleTimeChange,
      playing,
      onPlayingChange: setPlaying,
      speed,
      afterglowInSeconds,
    }),
    [spikes, seekToMs, handleTimeChange, playing, speed, afterglowInSeconds]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center gap-3">
        <ModeToggle options={modeOptions} />
        {showScene && !replayable && (
          <span role="status" className="text-xs text-amber-600">
            {population
              ? `This file records no population named “${population.name}”, so there is nothing to replay over these nodes. It has: ${data.populations.map((p) => p.name).join(', ') || 'none'}.`
              : 'Reading the circuit’s node populations…'}
          </span>
        )}
      </div>

      <div ref={containerRef} className="relative min-h-0 flex-1">
        <div
          className={classNames(
            'absolute left-0 right-0 top-0',
            !showScene && 'invisible pointer-events-none'
          )}
          style={{ bottom: mode === MODES.Split ? splitHeight : 0 }}
          aria-hidden={!showScene}
          inert={!showScene || undefined}
        >
          <CircuitScene
            circuit={circuit}
            active={showScene}
            onPopulationChange={setPopulation}
            spikes={spikeBinding}
          />
        </div>

        <div
          className={classNames(
            'absolute left-0 right-0 bottom-0',
            !showRaster && 'invisible pointer-events-none'
          )}
          style={mode === MODES.Split ? { height: splitHeight } : { top: 0 }}
          aria-hidden={!showRaster}
          inert={!showRaster || undefined}
        >
          {mode === MODES.Split && (
            <PaneResizeHandle
              containerRef={containerRef}
              minHeight={MIN_PANE_HEIGHT}
              onResize={setRasterHeight}
            />
          )}
          <RasterPlot
            data={data}
            playheadRef={playheadRef}
            onSeek={replayable ? handleSeek : undefined}
          />
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

/** Keep both panes usable however far the divider is dragged. */
function clampSplitHeight(rasterHeight: number | null, containerHeight: number): number {
  const preferred = rasterHeight ?? Math.round(containerHeight * DEFAULT_RASTER_HEIGHT_RATIO);
  if (containerHeight <= MIN_PANE_HEIGHT * 2) return Math.round(containerHeight / 2);
  return Math.min(containerHeight - MIN_PANE_HEIGHT, Math.max(MIN_PANE_HEIGHT, preferred));
}
