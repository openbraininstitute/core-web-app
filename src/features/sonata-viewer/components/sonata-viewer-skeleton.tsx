import { Skeleton } from '@/ui/molecules/skeleton';

/**
 * Placeholder shown while the SONATA report loads, shaped like the view it will become so the
 * layout does not jump when the traces arrive: the population, the plot, then the table of
 * recorded cells.
 */
export default function SonataViewerSkeleton() {
  return (
    <div className="@container flex h-full min-h-0 flex-col gap-3 px-4 pt-1.25 pb-4">
      <Skeleton className="h-8 w-56 rounded-full" />

      <div className="flex min-h-0 flex-[3] flex-col gap-3">
        <Skeleton className="ml-16 min-h-0 flex-1 rounded-lg" />
      </div>

      <div className="border-neutral-2 flex min-h-0 flex-[2] flex-col gap-2 border-t pt-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="min-h-0 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
