'use client';

import { RiResetLeftLine } from '@remixicon/react';
import { InputNumber } from 'antd';
import { useEffect, useState } from 'react';

type Props = {
  /** The span of time the raster shows, in ms. */
  from: number;
  to: number;
  /** The run's, which a typed span is kept inside. */
  min: number;
  max: number;
  /** Whether the raster is zoomed at all, in time or in rows: what the reset undoes. */
  zoomed: boolean;
  onChange: (from: number, to: number) => void;
  onReset: () => void;
};

/**
 * The raster's span of time, to read and to type: what a drag selects shows
 * up here, and a span typed here zooms the raster to it.
 */
export function TimeWindowFields({ from, to, min, max, zoomed, onChange, onReset }: Props) {
  const [start, setStart] = useState<number | null>(from);
  const [end, setEnd] = useState<number | null>(to);
  // A field being typed in keeps what is typed: committing the other one
  // zooms the raster, and the span coming back would overwrite it.
  const [editing, setEditing] = useState<'Start' | 'End' | null>(null);
  useEffect(() => {
    if (editing !== 'Start') setStart(from);
    if (editing !== 'End') setEnd(to);
  }, [from, to, editing]);

  const commit = () => {
    setEditing(null);
    const a = Math.max(min, Math.min(max, start ?? from));
    const b = Math.max(min, Math.min(max, end ?? to));
    // An empty or upside-down span changes nothing, and the fields go back.
    if (!(b > a)) {
      setStart(from);
      setEnd(to);
      return;
    }
    if (a !== from || b !== to) onChange(a, b);
  };

  const field = (label: 'Start' | 'End', value: number | null, set: (v: number | null) => void) => (
    <span className="flex items-center gap-1">
      <span className="text-neutral-400">{label}</span>
      <InputNumber
        size="small"
        variant="borderless"
        controls={false}
        precision={1}
        value={value}
        onChange={(v) => set(typeof v === 'number' ? v : null)}
        onFocus={() => setEditing(label)}
        onBlur={commit}
        onPressEnter={commit}
        className="w-14 [&_input]:!px-0.5 [&_input]:!text-xs [&_input]:font-semibold [&_input]:!text-primary-9 tabular-nums"
        aria-label={`${label} of the raster window, in ms`}
      />
    </span>
  );

  return (
    <div className="flex h-8 items-center gap-1.5 rounded-full bg-white pr-1.5 pl-3 text-sm shadow-md ring-1 ring-black/5">
      {field('Start', start, setStart)}
      {field('End', end, setEnd)}
      <span className="text-xs text-neutral-400">ms</span>
      <button
        type="button"
        onClick={onReset}
        disabled={!zoomed}
        title="Back to the whole run and every cell"
        aria-label="Reset the raster window"
        className="hover:text-primary-9 flex size-6 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-30"
      >
        <RiResetLeftLine className="size-3.5" />
      </button>
    </div>
  );
}
