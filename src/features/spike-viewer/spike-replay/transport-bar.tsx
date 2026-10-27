'use client';

import { RiPauseFill, RiPlayFill, RiRestartLine } from '@remixicon/react';
import { Slider } from 'antd';

import { Scrubber } from '@/features/spike-viewer/spike-replay/scrubber';
import { Button } from '@/ui/molecules/button';
import { classNames } from '@/util/utils';
import { fullscreenPopupContainer } from '@/utils/fullscreen';

import type { TimeAxis } from '@/features/spike-viewer/renderer/raster-renderer';

/**
 * Playback rates, as simulated milliseconds per wall-clock second.
 *
 * Named as multiples of real time, so `1×` means a millisecond of simulation
 * takes a millisecond to watch. Real recordings are milliseconds long, which is
 * why every preset below `1×` is the useful part of the range.
 */
export const SPEEDS = [
  { label: '1×', value: 1000 },
  { label: '0.5×', value: 500 },
  { label: '0.2×', value: 200 },
  { label: '0.1×', value: 100 },
  { label: '0.05×', value: 50 },
  { label: '0.02×', value: 20 },
  { label: '0.01×', value: 10 },
];

interface TransportBarProps {
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  /** Where the playhead is, in ms. Sampled, not per-frame — this drives React. */
  timeInMs: number;
  timeMinInMs: number;
  timeMaxInMs: number;
  onSeek: (timeInMs: number) => void;
  /** Simulated milliseconds per wall-clock second. */
  speed: number;
  onSpeedChange: (speed: number) => void;
  disabled?: boolean;
  /**
   * The raster's time axis, for a scrubber laid out under it: the span it
   * shows and where that sits. The bar is then play and scrubber alone; the
   * time rides the raster's playhead, and speed sits with the raster's own
   * controls.
   */
  axis?: TimeAxis | null;
  /** For the scrubber under the axis: the replay's clock, and where the replay moves its thumb from. */
  clock?: {
    timeRef: React.RefObject<number>;
    moveRef: React.RefObject<((timeInMs: number) => void) | null>;
  };
  /** In a pane's own box, which already sets it apart: no rule, and under an axis no inset. */
  boxed?: boolean;
}

/** Play / pause, scrubber and playback rate; how long a spike stays lit is in the scene's settings. */
export function TransportBar({
  playing,
  onPlayingChange,
  timeInMs,
  timeMinInMs,
  timeMaxInMs,
  onSeek,
  speed,
  onSpeedChange,
  disabled = false,
  axis = null,
  clock,
  boxed = false,
}: TransportBarProps) {
  const duration = timeMaxInMs - timeMinInMs;
  // Sub-millisecond steps: a 20 ms recording would otherwise scrub in 5% jumps.
  const step = Math.max(duration / 1000, 1e-3);

  if (axis && clock) {
    return (
      <div
        id="spike-replay-transport"
        className={boxed ? undefined : 'border-t border-neutral-200 px-3'}
      >
        {/* The raster's own frame: its container starts at this inset too. */}
        <div className="relative h-10">
          <div
            className="absolute inset-y-0 left-0 flex items-center justify-end pr-1.5"
            style={{ width: axis.left }}
          >
            <Button
              type="button"
              variant="icon"
              size="sm"
              disabled={disabled}
              aria-label={playing ? 'Pause spike replay' : 'Play spike replay'}
              onClick={() => onPlayingChange(!playing)}
            >
              {playing ? <RiPauseFill className="size-4" /> : <RiPlayFill className="size-4" />}
            </Button>
          </div>
          <Scrubber
            from={axis.from}
            to={axis.to}
            left={axis.left}
            right={axis.right}
            disabled={disabled}
            timeRef={clock.timeRef}
            moveRef={clock.moveRef}
            onSeek={onSeek}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      id="spike-replay-transport"
      className={classNames(
        'flex items-center gap-3 px-3 py-2',
        !boxed && 'border-t border-neutral-200'
      )}
    >
      <Button
        type="button"
        variant="icon"
        size="sm"
        disabled={disabled}
        aria-label={playing ? 'Pause spike replay' : 'Play spike replay'}
        onClick={() => onPlayingChange(!playing)}
      >
        {playing ? <RiPauseFill className="size-4" /> : <RiPlayFill className="size-4" />}
      </Button>
      <Button
        type="button"
        variant="icon"
        size="sm"
        disabled={disabled}
        aria-label="Restart spike replay"
        onClick={() => onSeek(timeMinInMs)}
      >
        <RiRestartLine className="size-4" />
      </Button>

      <Slider
        className="min-w-0 flex-1"
        value={timeInMs}
        min={timeMinInMs}
        max={timeMaxInMs}
        step={step}
        disabled={disabled}
        onChange={onSeek}
        tooltip={{
          formatter: (value) => `${(value ?? 0).toFixed(1)} ms`,
          getPopupContainer: fullscreenPopupContainer,
        }}
      />

      <span className="shrink-0 tabular-nums text-xs text-gray-600">
        {timeInMs.toFixed(1)} / {timeMaxInMs.toFixed(1)} ms
      </span>

      <label className="flex shrink-0 items-center gap-1 text-xs text-gray-600">
        <span className="sr-only">Playback speed</span>
        <select
          value={speed}
          disabled={disabled}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="rounded border border-neutral-200 bg-white px-1 py-0.5 text-xs"
          aria-label="Playback speed"
        >
          {SPEEDS.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
