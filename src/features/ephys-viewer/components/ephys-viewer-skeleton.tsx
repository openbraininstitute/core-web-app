import { type TViewVariant, ViewVariant } from '@/constants';
import { TraceViewMode } from '@/features/ephys-viewer/components/trace-view-mode-toggle';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

const OVERVIEW_GRID_CLASS_NAME =
  'grid gap-7 @max-xs:grid-cols-1 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 @6xl:grid-cols-5 @7xl:grid-cols-6';

const SELECTOR_KEYS = ['protocol', 'repetition', 'sweep'];
const TILE_KEYS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];

/**
 * Placeholder shown while the NWB trace loads. Mirrors the layout the viewer will
 * land on (driven by `view`) and the surrounding `variant` so it reads well on both
 * the light (white) and Default (dark) backgrounds.
 */
export default function EphysViewerSkeleton({
  view,
  variant = ViewVariant.Light,
}: {
  view: TraceViewMode;
  variant?: TViewVariant;
}) {
  // A light-grey skeleton is too harsh on the dark page; use a translucent white tone there.
  const tone = variant === ViewVariant.Default ? 'bg-white/10' : undefined;

  return (
    <div className="@container flex flex-col gap-6">
      {/* TraceViewModeToggle placeholder (rendered in both views) */}
      <div className="flex gap-2">
        <Skeleton className={cn(tone, 'h-8 w-28 rounded-full')} />
        <Skeleton className={cn(tone, 'h-8 w-36 rounded-full')} />
      </div>

      {view === TraceViewMode.OVERVIEW ? (
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-2">
            <Skeleton className={cn(tone, 'h-4 w-40')} />
            <Skeleton className={cn(tone, 'h-8 w-[200px]')} />
          </div>
          <div className={OVERVIEW_GRID_CLASS_NAME}>
            {TILE_KEYS.map((key) => (
              <Skeleton key={key} className={cn(tone, 'aspect-4/3 w-full')} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap gap-8">
            {SELECTOR_KEYS.map((key) => (
              <div key={key} className="flex flex-col gap-3">
                <Skeleton className={cn(tone, 'h-4 w-24')} />
                <Skeleton className={cn(tone, 'h-8 w-[180px]')} />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-10 2xl:flex-row">
            <Skeleton className={cn(tone, 'h-[40vh] w-full')} />
            <Skeleton className={cn(tone, 'h-[40vh] w-full')} />
          </div>
        </div>
      )}
    </div>
  );
}
