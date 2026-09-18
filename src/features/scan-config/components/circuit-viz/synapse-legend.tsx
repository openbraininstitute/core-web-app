'use client';

import { RiCloseLine } from '@remixicon/react';
import { useMemo, useState } from 'react';

import { cn } from '@/utils/css-class';

import type { TSmallCircuitSynapseGroup } from './sources/types';

/**
 * Key for the synapse marker colours, one row per distinct label.
 *
 * Read off the groups being drawn rather than from the palette, so it cannot
 * name a colour the scene is not using — an untyped population is listed under
 * its own name, since its type is the thing that is unknown.
 *
 * Dismissable and stays dismissed for the life of the viewer: the mapping is
 * fixed, so once it has been read it is only covering the circuit.
 */
export function SynapseLegend({ groups }: { groups?: readonly TSmallCircuitSynapseGroup[] }) {
  const [dismissed, setDismissed] = useState(false);
  const entries = useMemo(() => distinctEntries(groups), [groups]);

  if (dismissed || entries.length === 0) return null;

  return (
    <aside
      aria-label="Synapse colours"
      className={cn(
        'absolute right-3 top-14 z-10 flex flex-col gap-1.5 rounded-xl p-3 pr-2',
        'bg-white/70 text-neutral-800 shadow-lg ring-1 ring-black/5 backdrop-blur-md'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium text-primary-9">Synapses</p>
        <button
          type="button"
          aria-label="Hide synapse colours"
          onClick={() => setDismissed(true)}
          className="-mt-0.5 inline-flex size-5 items-center justify-center rounded-full text-neutral-500 hover:bg-black/5 focus-visible:outline-none"
        >
          <RiCloseLine className="size-3.5" />
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {entries.map(({ color, label }) => (
          <li key={label} className="flex items-center gap-2 pr-1">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: color }}
            />
            <span className="text-[11px] font-medium whitespace-nowrap">{label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** One row per label, in the order drawn: every typed circuit repeats the two types. */
function distinctEntries(groups?: readonly TSmallCircuitSynapseGroup[]) {
  const byLabel = new Map<string, string>();
  for (const { label, color } of groups ?? []) {
    if (!byLabel.has(label)) byLabel.set(label, color);
  }
  return [...byLabel].map(([label, color]) => ({ label, color }));
}
