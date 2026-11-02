'use client';

import { RiPauseFill, RiPlayFill } from '@remixicon/react';
import { Spin } from 'antd';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { useCircuitDrawsEachCell } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { SceneTime, useSceneTime } from '@/features/spike-viewer/components/scene-time';
import { Scrubber } from '@/features/spike-viewer/spike-replay/scrubber';
import { SPEEDS } from '@/features/spike-viewer/spike-replay/transport-bar';
import { Button } from '@/ui/molecules/button';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { TracesTimeAxis } from '@/features/sonata-viewer/components/report-details-view';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { CellFrames } from '@/features/sonata-viewer/types';

/** Plasma, low to high: a perceptual ramp on which a spike's peak flashes bright. */
const RAMP_STOPS = ['#0d0887', '#5c01a6', '#9c179e', '#cc4778', '#ed7953', '#fdb42f', '#f0f921'];
const RAMP_STEPS = 32;
const RAMP = Array.from({ length: RAMP_STEPS }, (_, i) => mix(RAMP_STOPS, i / (RAMP_STEPS - 1)));
/** The population's cells the report did not record: drawn faint, in the scene's ghost colour. */
const UNRECORDED = '#e5e7eb';
/** Colours change at most this often while playing; the clock itself moves every frame. */
const RECOLOR_MS = 50;
/** Simulated milliseconds per wall-clock second: a 1 s recording plays in 10 s. */
export const DEFAULT_SCENE_SPEED = 100;

const SCENE_FEATURES: Partial<IEntityViewerFeatures> = { nodesTable: false, colorBy: false };

type Props = {
  circuit: ICircuit;
  populationName: string;
  /** Cells in the node population, recorded or not. */
  cellCount: number;
  frames: CellFrames | null;
  /** The report's whole range of values, which the ramp spans. */
  valueRange: [number, number] | null;
  units: string;
  /** Moved as the scene plays, for the traces under it to mark. */
  timeCursor: TimeCursor;
  /** A cell to point out, by node index, such as the table row under the pointer. */
  highlightedCell?: number;
  /** One flag per cell, 0 for one left out: the picked cells, else those the table keeps. */
  shownCells?: Uint8Array;
  /** Told the node index of a cell clicked in the scene. */
  onCellClick?: (nodeId: number) => void;
  /** Told of a tap on the scene's empty space, which lets a cell picked in it go. */
  onEmptyClick?: () => void;
  /** How many recorded cells are selected, said with a reset at the scene's top centre. */
  selection?: ComponentProps<typeof CircuitScene>['selection'];
  /** In a box of its own, which frames it: no border of its own. */
  bare?: boolean;
  /** Off while out of sight: it stops playing and drawing. */
  active?: boolean;
  /** Simulated milliseconds per wall-clock second, which the host keeps. */
  speed: number;
  onSpeedChange: (speed: number) => void;
  /**
   * Where play and the scrubber go when they sit under the traces rather than
   * under the scene: the time is then on the traces' cursor, and the speed is
   * the host's to show. With `timeAxis` the scrubber lies under their time axis.
   */
  transportTarget?: HTMLElement | null;
  timeAxis?: TracesTimeAxis | null;
};

/**
 * A voltage report played over the circuit: each recorded cell coloured by its
 * value on a ramp across the report's whole range, the rest of the population
 * grey, with its own transport. The clock moves the scrubber and the traces'
 * cursor every frame and recolours the cells a little less often.
 */
export function VoltageScene({
  circuit,
  populationName,
  cellCount,
  frames,
  valueRange,
  units,
  timeCursor,
  highlightedCell,
  shownCells,
  onCellClick,
  onEmptyClick,
  selection,
  bare = false,
  active = true,
  speed,
  onSpeedChange,
  transportTarget,
  timeAxis = null,
}: Props) {
  const start = frames?.times[0] ?? 0;
  const end = frames ? frames.times[frames.times.length - 1] : 0;
  const frameStep = frames && frames.times.length > 1 ? frames.times[1] - frames.times[0] : 1;

  const timeRef = useRef(start);
  const scrubberRef = useRef<((timeInMs: number) => void) | null>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const recoloredAt = useRef(0);
  const sceneTime = useSceneTime(timeRef);
  const drawsEachCell = useCircuitDrawsEachCell();
  const showSceneTime = sceneTime.show;

  const frameAt = useCallback(
    (timeInMs: number) =>
      frames
        ? Math.min(frames.times.length - 1, Math.max(0, Math.round((timeInMs - start) / frameStep)))
        : 0,
    [frames, start, frameStep]
  );
  const moveTo = useCallback(
    (timeInMs: number, recolorNow: boolean) => {
      timeRef.current = timeInMs;
      scrubberRef.current?.(timeInMs);
      timeCursor.set(timeInMs);
      showSceneTime(timeInMs);
      if (readoutRef.current) readoutRef.current.textContent = `${timeInMs.toFixed(1)} ms`;
      const now = performance.now();
      if (recolorNow || now - recoloredAt.current >= RECOLOR_MS) {
        recoloredAt.current = now;
        setFrame(frameAt(timeInMs));
      }
    },
    [timeCursor, frameAt, showSceneTime]
  );
  // The cursor leaves the traces with the scene.
  useEffect(() => () => timeCursor.set(null), [timeCursor]);
  useLayoutEffect(() => {
    moveTo(timeRef.current, true);
  }, [moveTo]);

  useEffect(() => {
    if (!playing || !frames) return;
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      const next = Math.min(end, timeRef.current + ((now - last) / 1000) * speed);
      last = now;
      moveTo(next, next >= end);
      if (next >= end) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [playing, frames, end, speed, moveTo]);

  useEffect(() => {
    if (!active) setPlaying(false);
  }, [active]);

  const play = () => {
    // Played through, it starts again.
    if (!playing && timeRef.current >= end) moveTo(start, true);
    setPlaying(!playing);
  };

  const nodeColors = useMemo<NodeColors | undefined>(() => {
    if (!frames || !valueRange) return undefined;
    const [low, high] = valueRange;
    const span = high > low ? high - low : 1;
    const columnByNode = new Uint16Array(cellCount).fill(RAMP_STEPS);
    const offset = frame * frames.nodeIds.length;
    for (let c = 0; c < frames.nodeIds.length; c++) {
      const node = frames.nodeIds[c];
      if (node >= cellCount) continue;
      const share = (frames.values[offset + c] - low) / span;
      columnByNode[node] = Math.min(
        RAMP_STEPS - 1,
        Math.max(0, Math.round(share * (RAMP_STEPS - 1)))
      );
    }
    return { palette: [...RAMP, UNRECORDED], columnByNode };
  }, [frames, valueRange, cellCount, frame]);

  // The scrubber lies across its own track, measured, unless it is under the traces' axis.
  const [track, setTrack] = useState<HTMLDivElement | null>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  useLayoutEffect(() => {
    if (!track) return;
    const observer = new ResizeObserver(() => setTrackWidth(track.clientWidth));
    observer.observe(track);
    setTrackWidth(track.clientWidth);
    return () => observer.disconnect();
  }, [track]);

  const playButton = (
    <Button
      type="button"
      variant="icon"
      size="sm"
      disabled={!frames}
      aria-label={playing ? 'Pause the recording' : 'Play the recording'}
      onClick={play}
    >
      {playing ? <RiPauseFill className="size-4" /> : <RiPlayFill className="size-4" />}
    </Button>
  );
  const seek = (timeInMs: number) => moveTo(Math.min(end, Math.max(start, timeInMs)), true);
  // A scrubber over the run, across the track beside the play button.
  const trackScrubber = (
    <div ref={setTrack} className="relative h-6 min-w-0 flex-1">
      {frames && trackWidth > 0 && (
        <Scrubber
          from={start}
          to={end}
          left={0}
          right={trackWidth}
          timeRef={timeRef}
          moveRef={scrubberRef}
          onSeek={seek}
        />
      )}
    </div>
  );
  const docked = transportTarget !== undefined;
  // Under the traces: play in the plot's margin and the scrubber across the span it shows,
  // or, where their plots are several, beside each other over the run.
  const tracesTransport = timeAxis ? (
    <div className="relative h-10 shrink-0">
      <div
        className="absolute inset-y-0 left-0 flex items-center justify-end pr-1.5"
        style={{ width: timeAxis.left }}
      >
        {playButton}
      </div>
      {frames && (
        <Scrubber
          from={timeAxis.from}
          to={timeAxis.to}
          left={timeAxis.left}
          right={timeAxis.right}
          timeRef={timeRef}
          moveRef={scrubberRef}
          onSeek={seek}
        />
      )}
    </div>
  ) : (
    <div className="flex h-10 shrink-0 items-center gap-3">
      {playButton}
      {trackScrubber}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden',
          bare ? 'rounded-2xl' : 'rounded-xl border border-neutral-200'
        )}
      >
        <CircuitScene
          circuit={circuit}
          largeCircuit={!drawsEachCell(circuit)}
          features={SCENE_FEATURES}
          populationName={populationName}
          showUnselectedPopulations={false}
          nodeColorsOverride={nodeColors}
          fadedColumn={RAMP_STEPS}
          highlightedCell={highlightedCell}
          shownCells={shownCells}
          onCellClick={onCellClick}
          onEmptyClick={onEmptyClick}
          selection={selection}
          active={active}
        />
        {!frames && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spin tip="Reading the recording…">
              <div className="size-12" />
            </Spin>
          </div>
        )}
        {valueRange && <RampLegend range={valueRange} units={units} />}
        {frames && <SceneTime labelRef={sceneTime.ref} playing={playing} onPlayingChange={play} />}
      </div>
      {docked ? (
        transportTarget && active && createPortal(tracesTransport, transportTarget)
      ) : (
        <div className="flex h-10 shrink-0 items-center gap-3">
          {playButton}
          {trackScrubber}
          <span
            ref={readoutRef}
            className="w-16 shrink-0 text-right text-xs text-neutral-500 tabular-nums"
          />
          <SceneSpeedSelect speed={speed} onSpeedChange={onSpeedChange} />
        </div>
      )}
    </div>
  );
}

/** How fast the recording plays. */
export function SceneSpeedSelect({
  speed,
  onSpeedChange,
}: {
  speed: number;
  onSpeedChange: (speed: number) => void;
}) {
  return (
    <PillSelect
      label="Speed"
      value={String(speed)}
      options={SPEEDS.map((s) => ({ value: String(s.value), label: s.label }))}
      onChange={(v) => onSpeedChange(Number(v))}
    />
  );
}

/** The ramp and the values at its ends, in the scene's top corner, clear of its axes. */
function RampLegend({ range, units }: { range: [number, number]; units: string }) {
  return (
    <div className="pointer-events-none absolute top-3 right-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-neutral-500 shadow-sm">
      <div
        className="h-2 w-36 rounded-full"
        style={{ background: `linear-gradient(to right, ${RAMP_STOPS.join(', ')})` }}
      />
      <div className="mt-0.5 flex justify-between tabular-nums">
        <span>
          {range[0].toFixed(0)} {units}
        </span>
        <span>
          {range[1].toFixed(0)} {units}
        </span>
      </div>
    </div>
  );
}

/** The colour `share` of the way along `stops`, interpolated in RGB. */
function mix(stops: string[], share: number): string {
  const at = share * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(at));
  const f = at - i;
  const a = Number.parseInt(stops[i].slice(1), 16);
  const b = Number.parseInt(stops[i + 1].slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((a >> shift) & 255) * (1 - f) + ((b >> shift) & 255) * f);
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}
