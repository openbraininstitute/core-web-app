import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import styles from '@/features/scan-config/scan-config.module.css';

function TabsSkeleton() {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-gray-200">
      <Skeleton className="h-10 w-40 rounded-none" />
      <Skeleton className="h-10 w-40 rounded-none" />
    </div>
  );
}

function LeftColumnSkeleton() {
  return (
    <div
      className={cn(styles.scrollable, 'grid h-full grid-rows-[1fr_auto] gap-4 overflow-hidden')}
    >
      <div className="flex grow flex-col items-center gap-4 overflow-y-auto px-3 pb-3">
        <Skeleton className="h-3 w-14 self-start rounded-full" />
        <div className="rounded-full h-14! px-4 py-3 w-full border border-gray-200 bg-white">
          <div className="flex h-full items-center justify-between">
            <Skeleton className="h-4 w-1/2 rounded-full bg-gray-100" />
            <Skeleton className="h-4 w-10 rounded-full bg-gray-100" />
          </div>
        </div>
        <div className="rounded-full h-14! px-4 py-3 w-full border border-gray-200 bg-white">
          <div className="flex h-full items-center justify-between">
            <Skeleton className="h-4 w-2/3 rounded-full bg-gray-100" />
            <Skeleton className="h-4 w-10 rounded-full bg-gray-100" />
          </div>
        </div>

        <Skeleton className="mt-1 h-3 w-20 self-start rounded-full" />
        <div className="rounded-full h-14! px-4 py-3 w-full border border-gray-200 bg-white">
          <div className="flex h-full items-center justify-between">
            <Skeleton className="h-4 w-1/2 rounded-full bg-gray-100" />
            <Skeleton className="h-4 w-10 rounded-full bg-gray-100" />
          </div>
        </div>
        <div className="rounded-full h-14! px-4 py-3 w-full border border-gray-200 bg-white">
          <div className="flex h-full items-center justify-between">
            <Skeleton className="h-4 w-2/3 rounded-full bg-gray-100" />
            <Skeleton className="h-4 w-10 rounded-full bg-gray-100" />
          </div>
        </div>
      </div>

      <div className="w-full px-3">
        <Skeleton className="h-12.5 w-full rounded-full" />
      </div>
    </div>
  );
}

function MiddleColumnSkeleton() {
  return (
    <div
      className={cn(
        styles.scrollable,
        'h-full overflow-y-auto border-r border-l border-gray-200 px-4 py-3 secondary-scrollbar'
      )}
    >
      <div className="space-y-4 flex flex-col gap-4">
        <div className="space-y-2 mb-10">
          <Skeleton className="h-3 w-48 rounded-full" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-60 rounded-full" />
        </div>
        <div className="space-y-2 h-14!">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-12! w-full rounded-full" />
        </div>
        <div className="space-y-2 h-14!">
          <Skeleton className="h-3 w-32 rounded-full" />
          <Skeleton className="h-12! w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ModelPreviewSkeleton() {
  return <div className="h-full rounded-lg bg-gray-100 animate-pulse mr-3" />;
}

function HeaderActionSkeleton() {
  return (
    <div className="flex items-center justify-center gap-8">
      <Skeleton className="h-10 w-46 rounded-full" />
    </div>
  );
}

export function ScanConfigSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      <header className="flex flex-nowrap items-center justify-between gap-4 pt-4 pb-2 px-3">
        <TabsSkeleton />
        <HeaderActionSkeleton />
      </header>

      <div className="px-3 w-full">
        <div className="my-2 h-px w-full bg-gray-200" />
      </div>
      <div className="flex-1 min-h-0">
        <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-[5px] overflow-hidden py-2 *:min-w-0">
          <LeftColumnSkeleton />
          <MiddleColumnSkeleton />
          <div className="h-full min-w-0 overflow-auto secondary-scrollbar">
            <ModelPreviewSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScanConfigSkeleton;
