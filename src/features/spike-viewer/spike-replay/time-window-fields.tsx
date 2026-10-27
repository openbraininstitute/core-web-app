'use client';

import { RiResetLeftLine } from '@remixicon/react';
import { InputNumber } from 'antd';
import { useEffect, useState } from 'react';

import { PILL_CLASS, ROUND_PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

type Props = {
  /** The span of time the plot shows, in ms. */
  from: number;
  to: number;
  /** The run's, which a typed span is kept inside. */
  min: number;
  max: number;
  onChange: (from: number, to: number) => void;
};

/**
 * A plot's span of time, to read and to type: what a zoom selects shows up
 * here, and a span typed here zooms the plot to it. The way back to the whole
 * run is the {@link WindowResetButton} beside it.
 */
export function TimeWindowFields({ from, to, min, max, onChange }: Props) {
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
        // As wide as its number, so short times leave no gap before what follows.
        style={{ width: `${Math.max(3, (value ?? 0).toFixed(1).length) + 0.5}ch` }}
        className="[&_input]:!px-0.5 [&_input]:!text-sm [&_input]:font-semibold [&_input]:!text-primary-9 tabular-nums"
        aria-label={`${label} of the time window, in ms`}
      />
    </span>
  );

  return (
    // The dropdowns' pill, as tall and in their type, with fields in place of a value.
    <div className={cn(PILL_CLASS, 'gap-1 hover:bg-white')}>
      {field('Start', start, setStart)}
      {field('End', end, setEnd)}
      <span className="text-xs text-neutral-400">ms</span>
    </div>
  );
}

/**
 * Back to the whole run, as a round button of its own beside the time bar:
 * always there, so the controls after it stay put, and live only while a zoom
 * is on.
 */
export function WindowResetButton({
  zoomed,
  title,
  onReset,
}: {
  zoomed: boolean;
  /** What it undoes, such as the raster's zoom in time and in rows. */
  title: string;
  onReset: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      disabled={!zoomed}
      title={title}
      aria-label={title}
      className={cn(ROUND_PILL_CLASS, 'disabled:pointer-events-none disabled:opacity-40')}
    >
      <RiResetLeftLine className="size-4" />
    </button>
  );
}
