import { type TViewVariant, ViewVariant } from '@/constants';
import {
  TraceViewMode,
  type TTraceViewMode,
} from '@/features/ephys-viewer/components/trace-view-mode-toggle';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TEphysControlsVariant } from '@/features/ephys-viewer/components/ephys-select';

const OVERVIEW_GRID_CLASS_NAME =
  'grid gap-7 @max-xs:grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6';

const TILE_KEYS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
const SWATCH_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11'];
const PLOT_KEYS = ['stimulus', 'response'];

/** A labelled control: the title line, then the box at the app select's height and radius. */
function SelectPlaceholder({ tone, className }: { tone?: string; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <Skeleton className={cn(tone, 'h-4 w-24')} />
      <Skeleton className={cn(tone, 'h-11 w-full rounded-lg')} />
    </div>
  );
}

/**
 * The sweep picker: a label over a wrapping run of colour swatches.
 *
 * Drawn as swatches rather than one bar because that is what arrives — a single wide block set
 * the wrong expectation and then collapsed into two short rows.
 */
function SweepPlaceholder({ tone }: { tone?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <Skeleton className={cn(tone, 'h-4 w-28')} />
      {/* size and gap track SweepSelector's own swatches */}
      <div className="flex flex-wrap items-center gap-1">
        {SWATCH_KEYS.map((key) => (
          <Skeleton key={key} className={cn(tone, 'size-10 rounded')} />
        ))}
      </div>
    </div>
  );
}

/** A plot with its section label, at the height the real one settles on. */
function PlotPlaceholder({ tone, className }: { tone?: string; className?: string }) {
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <Skeleton className={cn(tone, 'h-4 w-20')} />
      <Skeleton className={cn(tone, 'h-[40vh] w-full rounded-lg')} />
    </div>
  );
}

/**
 * Placeholder shown while the NWB trace loads.
 *
 * Mirrors the layout the viewer will land on — driven by `view` and `controlsVariant` — and the
 * surrounding `variant` so it reads on both the light and Default (dark) backgrounds.
 *
 * `detailControls` is rendered for real rather than as a placeholder. A host control that picks
 * *which* trace is loaded is not waiting on that trace: skeletonising it made changing input
 * blank the very select you had just used, and left no way to change your mind until the
 * download finished.
 */
export default function EphysViewerSkeleton({
  view,
  variant = ViewVariant.Light,
  showViewModeToggle = true,
  detailControls,
  controlsVariant = 'page',
}: {
  view: TTraceViewMode;
  variant?: TViewVariant;
  /** Mirrors the viewer's own prop, so a hidden switch leaves no phantom control behind. */
  showViewModeToggle?: boolean;
  /** The host's live controls, rendered as-is at the head of the control row. */
  detailControls?: ReactNode;
  /** Mirrors the viewer's own prop, so the placeholder lands on the layout the controls will use. */
  controlsVariant?: TEphysControlsVariant;
}) {
  // A light-grey skeleton is too harsh on the dark page; use a translucent white tone there.
  const tone = variant === ViewVariant.Default ? 'bg-white/10' : undefined;
  const isPanel = controlsVariant === 'panel';

  // the pA / nA segment switch, which only some recordings carry — reserved either way, since
  // its absence shifts nothing else in the row
  const unitTogglePlaceholder = <Skeleton className={cn(tone, 'ml-auto h-9 w-24 rounded-lg')} />;

  return (
    <div className="@container flex flex-col gap-6">
      {showViewModeToggle && (
        <div className="flex gap-2">
          <Skeleton className={cn(tone, 'h-8 w-28 rounded-full')} />
          <Skeleton className={cn(tone, 'h-8 w-36 rounded-full')} />
        </div>
      )}

      {view === TraceViewMode.Overview ? (
        <div className="flex flex-col gap-10">
          <SelectPlaceholder tone={tone} className="w-48" />
          <div className={OVERVIEW_GRID_CLASS_NAME}>
            {TILE_KEYS.map((key) => (
              <Skeleton key={key} className={cn(tone, 'aspect-4/3 w-full rounded-lg')} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {isPanel ? (
            <div className="flex flex-col gap-5">
              {/* Repetition hides itself when the trace has only one, so the panel reserves the
                  controls it always has — the host's, plus Protocol — rather than a column that
                  may never arrive and would leave a gap behind. */}
              <div className="grid auto-cols-fr grid-flow-col items-end gap-3">
                {detailControls}
                <SelectPlaceholder tone={tone} />
              </div>
              <div className="flex flex-wrap items-end gap-6">
                <SweepPlaceholder tone={tone} />
                {unitTogglePlaceholder}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-8">
              {detailControls}
              <SelectPlaceholder tone={tone} className="w-[180px] max-w-full flex-none" />
              <SelectPlaceholder tone={tone} className="w-[180px] max-w-full flex-none" />
              <SweepPlaceholder tone={tone} />
              {unitTogglePlaceholder}
            </div>
          )}

          <div className={cn('flex flex-col gap-10', !isPanel && '2xl:flex-row')}>
            {PLOT_KEYS.map((key) => (
              <PlotPlaceholder key={key} tone={tone} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
