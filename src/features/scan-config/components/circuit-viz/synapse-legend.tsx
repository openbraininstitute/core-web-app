'use client';

import { RiArrowUpSLine, RiBubbleChartLine, RiEyeLine, RiEyeOffLine } from '@remixicon/react';
import { useMemo, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { TSmallCircuitSynapseGroup } from './sources/types';

/** The glass pill both the collapsed button and the open card are cut from. */
const SURFACE = 'bg-white/70 text-neutral-800 shadow-lg ring-1 ring-black/5 backdrop-blur-md';

/** Shared shape for the card's own round controls. */
const ICON_BUTTON =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/5 hover:text-neutral-800 focus-visible:outline-none';

/**
 * Key for the synapse marker colours, one row per distinct label, each row
 * showing or hiding its own synapses.
 *
 * Collapses to its icon rather than closing: hiding a type from here is
 * reversible only from here, so a control that took the legend away for good
 * could take the synapses with it.
 */
export function SynapseLegend({
  groups,
  belowChrome = false,
  hidden,
  onToggle,
}: {
  groups?: readonly TSmallCircuitSynapseGroup[];
  /** Drop below the host's own top-right controls instead of taking the corner. */
  belowChrome?: boolean;
  /** Labels whose synapses are hidden. */
  hidden?: ReadonlySet<string>;
  /** Show or hide every group carrying this label. */
  onToggle?: (label: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const entries = useMemo(() => distinctEntries(groups), [groups]);

  if (entries.length === 0) return null;

  const position = cn('absolute right-3 z-10', belowChrome ? 'top-14' : 'top-3');

  if (!open) {
    return (
      <LegendTooltip label="Show synapse colours">
        <button
          type="button"
          aria-label="Show synapse colours"
          aria-expanded={false}
          onClick={() => setOpen(true)}
          className={cn(
            position,
            SURFACE,
            'inline-flex size-8 items-center justify-center rounded-full hover:bg-white/85'
          )}
        >
          <RiBubbleChartLine className="size-4" />
        </button>
      </LegendTooltip>
    );
  }

  return (
    <aside
      aria-label="Synapse colours"
      className={cn(position, SURFACE, 'flex flex-col gap-1.5 rounded-xl p-2.5')}
    >
      <div className="flex items-center gap-2">
        <RiBubbleChartLine aria-hidden className="size-3.5 shrink-0 text-primary-9" />
        <p className="mr-auto text-[11px] font-medium text-primary-9">Synapses</p>
        <LegendTooltip label="Collapse synapse colours">
          <button
            type="button"
            aria-label="Collapse synapse colours"
            aria-expanded
            onClick={() => setOpen(false)}
            className={ICON_BUTTON}
          >
            <RiArrowUpSLine className="size-3.5" />
          </button>
        </LegendTooltip>
      </div>
      <ul className="flex flex-col gap-0.5">
        {entries.map(({ color, label }) => {
          const isHidden = hidden?.has(label) ?? false;
          const EyeIcon = isHidden ? RiEyeOffLine : RiEyeLine;
          const action = isHidden ? `Show ${label} synapses` : `Hide ${label} synapses`;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  'size-2.5 shrink-0 rounded-full ring-1 ring-black/10',
                  isHidden && 'opacity-30'
                )}
                style={{ backgroundColor: color }}
              />
              <span
                className={cn(
                  'mr-auto text-[11px] font-medium whitespace-nowrap',
                  isHidden && 'text-neutral-400'
                )}
              >
                {label}
              </span>
              <LegendTooltip label={action}>
                <button
                  type="button"
                  aria-label={action}
                  aria-pressed={isHidden}
                  onClick={() => onToggle?.(label)}
                  className={ICON_BUTTON}
                >
                  <EyeIcon className="size-3.5" />
                </button>
              </LegendTooltip>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** The chrome's own tooltip, so the legend's buttons read like every other viewer control. */
function LegendTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        align="center"
        side="bottom"
        sideOffset={0}
        arrowClassName="bg-gray-200"
        className="text-primary-9 bg-gray-200"
      >
        {label}
      </TooltipContent>
    </Tooltip>
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
