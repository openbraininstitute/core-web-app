import { useEffect, useRef, useState } from 'react';

import { PopulationSelect } from '@/features/circuit-nodes/components/population-select';

import type { ReactNode } from 'react';
import type { ColumnMeta } from '@/features/circuit-nodes/types';
import type { TimeRange } from '@/features/sonata-viewer/hooks/use-plot-listeners';
import type { CellFrames, PopulationMetadata } from '@/features/sonata-viewer/types';

/** Past this many values a property is closer to an id than a group. */
const MAX_GROUPS = 80;

/** The population the plot and the table are showing, and the switch between populations. */
export function PopulationHeader({
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
    </div>
  );
}

/** The node properties worth grouping by: categorical, with a manageable number of values. */
export function groupingColumns(columns: ColumnMeta[]): ColumnMeta[] {
  return columns.filter(
    (c) =>
      c.kind === 'categorical' &&
      (c.library?.length ?? 0) > 1 &&
      (c.library?.length ?? 0) <= MAX_GROUPS
  );
}

/** Mounts what it holds once it scrolls near view, then keeps it: a long list costs what is seen. */
export function WhenNearView({ className, children }: { className?: string; children: ReactNode }) {
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

/** The frames within a window of the run: all of them without one. */
export function framesWithin(frames: CellFrames, window: TimeRange | null): CellFrames {
  if (!window) return frames;
  const columns = frames.nodeIds.length;
  let first = 0;
  while (first < frames.times.length && frames.times[first] < window[0]) first += 1;
  let end = first;
  while (end < frames.times.length && frames.times[end] <= window[1]) end += 1;
  return {
    nodeIds: frames.nodeIds,
    times: frames.times.subarray(first, end),
    values: frames.values.subarray(first * columns, end * columns),
  };
}
