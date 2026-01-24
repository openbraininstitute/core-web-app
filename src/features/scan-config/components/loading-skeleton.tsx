import styles from '@/features/scan-config/scan-config.module.css';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

function TabsSkeleton() {
  return (
    <div className="flex">
      <div className="inline-flex overflow-hidden rounded-full border border-gray-200">
        <Skeleton className="h-10 w-32 rounded-l-full rounded-r-none" />
        <Skeleton className="h-10 w-28 rounded-l-none rounded-r-full" />
      </div>
    </div>
  );
}

function RootElementSkeleton({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      )}
    </div>
  );
}

function LeftColumnSkeleton() {
  return (
    <div className={styles.scrollable}>
      <div className="flex grow flex-col items-center gap-5 overflow-y-auto pr-5 pb-5">
        <Skeleton className="h-4 w-20 self-start" />
        <RootElementSkeleton expanded />
        <RootElementSkeleton />

        <Skeleton className="mt-2 h-4 w-24 self-start" />
        <RootElementSkeleton expanded />
        <RootElementSkeleton />
        {/* <RootElementSkeleton />

        <Skeleton className="mt-2 h-4 w-16 self-start" />
        <RootElementSkeleton /> */}
      </div>

      {/* Generate button */}
      <div className="w-full px-4">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

function BlockOptionSkeleton() {
  return (
    <div className="min-h-25 w-full rounded-xl border border-gray-200 p-5">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-3/4" />
    </div>
  );
}

function MiddleColumnSkeleton() {
  return (
    <div
      className={cn(
        styles.scrollable,
        'h-full overflow-y-auto border-r border-l border-gray-200 px-5'
      )}
    >
      <div className="flex flex-col items-center gap-5">
        <BlockOptionSkeleton />
        <BlockOptionSkeleton />
        <BlockOptionSkeleton />
      </div>
    </div>
  );
}

function ModelPreviewSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-lg bg-gray-50 p-5">
      <Skeleton className="h-5 w-20" />
      <div className="mt-4 flex flex-1 items-center justify-center">
        <div className="relative h-full w-full">
          {/* 3D viewer placeholder with subtle animation */}
          <Skeleton className="h-full w-full rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScanConfigSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-full flex-col space-y-5', className)}>
      <header className={styles.header}>
        <TabsSkeleton />
        <Skeleton className="h-8 w-48 rounded" />
      </header>

      <div className="relative mb-10">
        <div className="w-full border-t border-gray-200" />
      </div>

      <div className={styles.threeColumns}>
        <LeftColumnSkeleton />
        <MiddleColumnSkeleton />
        <div className="rounded-lg">
          <ModelPreviewSkeleton />
        </div>
      </div>
    </div>
  );
}

export default ScanConfigSkeleton;
