'use client';

import { RiPauseFill, RiPlayFill } from '@remixicon/react';
import { Spin } from 'antd';
import { atom, useAtom } from 'jotai';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CircuitScene } from '@/features/circuit-viewer/circuit-scene';
import { useCircuitDrawsEachCell } from '@/features/scan-config/components/circuit-viz/sources/draws-morphologies';
import { SceneTime, useSceneTime } from '@/features/spike-viewer/components/scene-time';
import { Scrubber } from '@/features/spike-viewer/spike-replay/scrubber';
import { SPEEDS } from '@/features/spike-viewer/spike-replay/transport-bar';
import { Button } from '@/ui/molecules/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/molecules/select';
import { PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { ComponentProps } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEntityViewerFeatures } from '@/entity-configuration/domain/viewer-config';
import type { SceneMatrix } from '@/features/circuit-nodes/connectivity/table-matrix';
import type { SceneLocationMarker } from '@/features/scan-config/components/circuit-viz/circuit-viz';
import type { NodeColors } from '@/features/scan-config/components/color-by/types';
import type { TracesTimeAxis } from '@/features/sonata-viewer/components/report-details-view';
import type { TimeCursor } from '@/features/sonata-viewer/time-cursor';
import type { CellFrames, TraceFrames } from '@/features/sonata-viewer/types';

/** Odd, so a centred bar has a step in plain grey. */
const RAMP_STEPS = 33;
/** The bars' grey: mid-grey, clear of the white scene and of its unrecorded cells. */
const BAR_GREY = '#a8adb7';

/**
 * The bars a recording can play on, low to high, the first where none has been chosen. A
 * centred one has grey at the recording's median, so a cell reads as above or below where the
 * recording mostly sits; the others climb from grey across the whole range.
 */
const RAMPS = [
  {
    value: 'purple-grey-orange',
    label: 'Purple / grey / orange',
    stops: ['#5e3c99', BAR_GREY, '#e66101'],
    centred: true,
  },
  { value: 'grey-green', label: 'Grey / green', stops: [BAR_GREY, '#16a34a'], centred: false },
  { value: 'grey-blue', label: 'Grey / blue', stops: [BAR_GREY, '#1d4ed8'], centred: false },
  { value: 'grey-orange', label: 'Grey / orange', stops: [BAR_GREY, '#e66101'], centred: false },
  { value: 'grey-red', label: 'Grey / red', stops: [BAR_GREY, '#dc2626'], centred: false },
  {
    value: 'blue-grey-green',
    label: 'Blue / grey / green',
    stops: ['#1d4ed8', BAR_GREY, '#16a34a'],
    centred: true,
  },
  {
    value: 'blue-grey-red',
    label: 'Blue / grey / red',
    stops: ['#1d4ed8', BAR_GREY, '#dc2626'],
    centred: true,
  },
].map((ramp) => ({
  ...ramp,
  steps: Array.from({ length: RAMP_STEPS }, (_, i) => mix(ramp.stops, i / (RAMP_STEPS - 1))),
}));
type Ramp = (typeof RAMPS)[number];

/** The bar in use, kept from one recording to the next. */
const rampAtom = atom(RAMPS[0].value);

/** About how many values a recording's median is taken from. */
const MEDIAN_SAMPLE = 200_000;

/** The population's cells the report did not record: drawn faint, in the scene's ghost colour. */
const UNRECORDED = '#e5e7eb';
/**
 * The recorded cells while their locations play as balls: plain, so the balls carry the values.
 * Dark enough that the viewer's hover, which adds a cell's colour to itself, stays off white.
 */
const PLAIN = '#5c677a';
/** A ball's colour while its values load. */
const UNPLAYED = '#9ca3af';
/** The other balls while one is pointed out. */
const FADED_BALL = '#e5e7eb';
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
  /**
   * The report's locations on its cells, each at a section and an offset along it, played as
   * balls in their own values while the cells are drawn plain: a compartment set's.
   */
  locations?: readonly SceneLocation[];
  /** The locations' values over the run, a column each in their order; null while they load. */
  locationFrames?: TraceFrames | null;
  /** The locations to show by key, such as those picked; all of those on the cells shown without. */
  shownLocations?: ReadonlySet<number> | null;
  /** A location to point out by key, such as the table row under the pointer: the rest faded. */
  highlightedLocation?: number;
  /** Told the key of a location's ball clicked. */
  onLocationClick?: (key: number) => void;
  /** Told the key of the location's ball under the pointer, and null once it leaves them. */
  onLocationHover?: (key: number | null) => void;
  /** A connectivity matrix in the table beside the scene, whose pathway it colours. */
  matrix?: SceneMatrix;
};

/**
 * A location a report recorded: its key, such as the trace it plays, its cell's node index,
 * its SONATA section id, and its offset along that section.
 */
export type SceneLocation = { key: number; nodeId: number; sectionId: number; offset: number };

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
  locations,
  locationFrames = null,
  shownLocations,
  highlightedLocation,
  onLocationClick,
  onLocationHover,
  matrix,
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
  const ballsPlay = (locations?.length ?? 0) > 0;
  // The balls sit on the cells' sections, which only the per-cell renderer has.
  const drawsEachCell = useCircuitDrawsEachCell(circuit, ballsPlay);
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

  const [rampName, setRampName] = useAtom(rampAtom);
  const ramp = RAMPS.find((r) => r.value === rampName) ?? RAMPS[0];
  // Balls carry the values while they play, so the bar's middle is theirs.
  const played = ballsPlay && locationFrames ? locationFrames.values : frames?.values;
  const playedColumns = ballsPlay && locationFrames ? locations?.length : frames?.nodeIds.length;
  const middle = useMemo(
    () => (ramp.centred && played && playedColumns ? medianOf(played, playedColumns) : null),
    [ramp.centred, played, playedColumns]
  );
  const rampStep = useCallback(
    (value: number) => {
      const share = shareAlong(value, valueRange ?? [0, 1], middle);
      return Math.min(RAMP_STEPS - 1, Math.max(0, Math.round(share * (RAMP_STEPS - 1))));
    },
    [valueRange, middle]
  );
  const nodeColors = useMemo<NodeColors | undefined>(() => {
    if (!frames || !valueRange) return undefined;
    const columnByNode = new Uint16Array(cellCount).fill(RAMP_STEPS);
    const offset = frame * frames.nodeIds.length;
    for (let c = 0; c < frames.nodeIds.length; c++) {
      const node = frames.nodeIds[c];
      if (node >= cellCount) continue;
      // With balls on its locations, a cell is drawn plain: they carry its values.
      columnByNode[node] = ballsPlay ? RAMP_STEPS + 1 : rampStep(frames.values[offset + c]);
    }
    return { palette: [...ramp.steps, UNRECORDED, PLAIN], columnByNode };
  }, [frames, valueRange, cellCount, frame, ballsPlay, rampStep, ramp]);

  // Each location's ball in its value at the time on show, the frames' nearest: those on the
  // cells shown, or those picked, the one pointed out alone in colour.
  const locationMarkers = useMemo<SceneLocationMarker[] | undefined>(() => {
    if (!locations || locations.length === 0) return undefined;
    const time = frames?.times[frame] ?? 0;
    const times = locationFrames?.times;
    const step = times && times.length > 1 ? times[1] - times[0] : 1;
    const at = times
      ? Math.min(times.length - 1, Math.max(0, Math.round((time - times[0]) / step)))
      : 0;
    return locations.flatMap((location, i) => {
      if (
        shownLocations ? !shownLocations.has(location.key) : shownCells?.[location.nodeId] === 0
      ) {
        return [];
      }
      const color =
        highlightedLocation !== undefined && highlightedLocation !== location.key
          ? FADED_BALL
          : locationFrames
            ? ramp.steps[rampStep(locationFrames.values[at * locations.length + i])]
            : UNPLAYED;
      return [{ ...location, color }];
    });
  }, [
    locations,
    locationFrames,
    frames,
    frame,
    rampStep,
    ramp,
    shownLocations,
    shownCells,
    highlightedLocation,
  ]);

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
        {/* Its renderer waits on whether Bluenaas has the circuit's pack. */}
        {drawsEachCell !== undefined && (
          <CircuitScene
            circuit={circuit}
            largeCircuit={!drawsEachCell}
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
            locationMarkers={locationMarkers}
            onLocationClick={onLocationClick}
            onLocationHover={onLocationHover}
            matrix={matrix}
            keys={
              valueRange && (
                <RampLegend
                  range={valueRange}
                  middle={middle}
                  units={units}
                  ramp={ramp}
                  onRampChange={setRampName}
                />
              )
            }
          />
        )}
        {!frames && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Spin tip="Reading the recording…">
              <div className="size-12" />
            </Spin>
          </div>
        )}
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

/**
 * The bar and the values along it, for the scene's top corner, clear of its axes: a menu of
 * the other bars.
 */
function RampLegend({
  range,
  middle,
  units,
  ramp,
  onRampChange,
}: {
  range: [number, number];
  /** The value at a centred bar's middle. */
  middle: number | null;
  units: string;
  ramp: Ramp;
  onRampChange: (value: string) => void;
}) {
  return (
    <Select value={ramp.value} onValueChange={onRampChange}>
      <SelectTrigger
        aria-label="Color bar"
        title={
          middle === null
            ? `Color bar: ${ramp.label}`
            : `Color bar: ${ramp.label}, grey at the recording's median`
        }
        className="gap-1.5 rounded-lg border-0 bg-white/90 px-2.5 py-1.5 text-[10px] font-normal text-neutral-500 shadow-sm hover:bg-white focus-visible:ring-0 data-[size=default]:h-auto"
      >
        <span className="block w-36">
          <span className="block h-2 rounded-full" style={{ background: gradientOf(ramp.stops) }} />
          <span className="mt-0.5 grid grid-cols-3 tabular-nums">
            <span className="text-left">
              {range[0].toFixed(0)} {units}
            </span>
            <span className="text-center">{middle === null ? null : middle.toFixed(0)}</span>
            <span className="text-right">
              {range[1].toFixed(0)} {units}
            </span>
          </span>
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-gray-100 bg-white p-1 shadow-xl">
        {RAMPS.map((option) => (
          <SelectItem key={option.value} value={option.value} className="rounded-lg text-xs">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-16 rounded-full"
                style={{ background: gradientOf(option.stops) }}
              />
              {option.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function gradientOf(stops: string[]): string {
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

/**
 * How far along a bar a value falls. Each arm of a centred bar takes half of it, however much
 * of the range lies that side of the middle: a spike reaches far above rest, a dip not far below.
 */
function shareAlong(value: number, [low, high]: [number, number], middle: number | null): number {
  if (middle === null || middle <= low || middle >= high) {
    return (value - low) / (high > low ? high - low : 1);
  }
  return value < middle
    ? (0.5 * (value - low)) / (middle - low)
    : 0.5 + (0.5 * (value - middle)) / (high - middle);
}

/**
 * The median of a recording's values, a value per column per frame. Taken over whole frames, a
 * thinned set of them: every so many values alone could keep landing on the same few cells.
 */
function medianOf(values: Float32Array, columns: number): number | null {
  const frames = Math.floor(values.length / columns);
  const frameStep = Math.max(1, Math.ceil(values.length / MEDIAN_SAMPLE));
  const sample = new Float32Array(Math.ceil(frames / frameStep) * columns);
  let count = 0;
  const first = Math.max(0, Math.min(frames - 1, frameStep >> 1));
  for (let frame = first; frame < frames; frame += frameStep) {
    for (let c = 0; c < columns; c++) {
      const value = values[frame * columns + c];
      if (!Number.isNaN(value)) sample[count++] = value;
    }
  }
  return count > 0 ? sample.subarray(0, count).sort()[count >> 1] : null;
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
