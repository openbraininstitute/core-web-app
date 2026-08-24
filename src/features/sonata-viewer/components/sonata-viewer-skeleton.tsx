import { OVERVIEW_GRID_CLASS_NAME } from '@/features/sonata-viewer/constants';
import { Skeleton } from '@/ui/molecules/skeleton';

const TILE_KEYS = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];
const PLOT_KEYS = ['p0', 'p1'];

/** A labelled control: the title line, then the box at the app select's height and radius. */
function SelectPlaceholder() {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

/** One overview thumbnail: its title, then the 4:3 chart box. */
function ThumbnailPlaceholder() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="aspect-4/3 w-full rounded-lg" />
    </div>
  );
}

/** One interactive plot, at the height the real one settles on. */
function PlotPlaceholder() {
  return (
    <div className="flex w-full flex-col gap-1">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-[40vh] w-full rounded-lg" />
    </div>
  );
}

/**
 * Placeholder shown while the SONATA report loads, shaped like the view it will become so the
 * layout does not jump when the traces arrive.
 */
export default function SonataViewerSkeleton({ overview }: { overview: boolean }) {
  return (
    <div className="@container flex flex-col gap-6">
      {/* mirrors the MotionTabs pill list, so the real tabs land in the same place */}
      <div className="inline-flex w-fit items-center gap-1 rounded-full bg-gray-50 p-1">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>

      {overview ? (
        <div className="flex flex-col gap-10">
          <div className={OVERVIEW_GRID_CLASS_NAME}>
            {TILE_KEYS.map((key) => (
              <ThumbnailPlaceholder key={key} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-14">
          <SelectPlaceholder />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,25rem),1fr))] gap-10">
            {PLOT_KEYS.map((key) => (
              <PlotPlaceholder key={key} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
