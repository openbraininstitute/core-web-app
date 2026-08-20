'use client';

import { SettingOutlined } from '@ant-design/icons';
import { RiPauseFill, RiPlayFill, RiRestartLine } from '@remixicon/react';
import { Slider } from 'antd';

import { Button } from '@/ui/molecules/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

/**
 * Playback rates, as simulated milliseconds per wall-clock second.
 *
 * Named as multiples of real time, so `1×` means a millisecond of simulation
 * takes a millisecond to watch. Real recordings are milliseconds long, which is
 * why every preset below `1×` is the useful part of the range.
 */
const SPEEDS = [
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
  /** Wall-clock seconds for a spike to fade to `1/e` of full brightness. */
  afterglowInSeconds: number;
  onAfterglowChange: (afterglowInSeconds: number) => void;
  disabled?: boolean;
}

/** Play / pause, scrubber, playback rate, and how long a spike stays lit. */
export function TransportBar({
  playing,
  onPlayingChange,
  timeInMs,
  timeMinInMs,
  timeMaxInMs,
  onSeek,
  speed,
  onSpeedChange,
  afterglowInSeconds,
  onAfterglowChange,
  disabled = false,
}: TransportBarProps) {
  const duration = timeMaxInMs - timeMinInMs;
  // Sub-millisecond steps: a 20 ms recording would otherwise scrub in 5% jumps.
  const step = Math.max(duration / 1000, 1e-3);

  return (
    <div className="flex items-center gap-3 border-t border-neutral-200 px-2 py-1.5">
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
        tooltip={{ formatter: (value) => `${(value ?? 0).toFixed(1)} ms` }}
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

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="icon"
            size="sm"
            disabled={disabled}
            aria-label="Open replay settings"
          >
            <SettingOutlined />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 border-neutral-2 bg-white shadow-lg">
          <div className="flex select-none flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Spike afterglow</span>
              <span className="tabular-nums">{afterglowInSeconds.toFixed(2)} s</span>
            </div>
            <Slider
              value={afterglowInSeconds}
              min={0.05}
              max={2}
              step={0.05}
              disabled={disabled}
              onChange={onAfterglowChange}
              tooltip={{ formatter: null }}
            />
            <p className="text-[11px] leading-snug text-gray-500">
              How long a spike stays lit on screen. Measured in real time, so a flash looks the same
              at any playback speed.
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
