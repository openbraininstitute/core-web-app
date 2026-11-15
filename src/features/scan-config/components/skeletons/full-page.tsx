'use client';

import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import ScanConfigTabsPanel, { toScanConfigTab } from '@/features/scan-config/components/tabs';
import {
  BaseScanConfigTabs,
  ScanConfigActivity,
  type TScanConfigActivity,
} from '@/features/scan-config/types';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import styles from '@/features/scan-config/scan-config.module.css';

function LeftColumnSkeleton() {
  return (
    <div
      className={cn(styles.scrollable, 'grid h-full grid-rows-[1fr_auto] gap-4 overflow-hidden')}
    >
      <div className="flex grow flex-col items-center gap-4 overflow-y-auto px-2 pb-5">
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

      <div className="w-full border-t border-gray-200 px-2 pt-3 pb-3">
        <Skeleton className="h-12.5 w-full rounded-full" />
      </div>
    </div>
  );
}

function ModelPreviewSkeleton() {
  return <div className="h-full rounded-lg bg-gray-100 animate-pulse mr-3" />;
}

/** The Simulate page's preview: the 3D view's box over the nodes table's, as `StackedPanes` lays them. */
function BoxedPreviewSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 pt-px pr-px pb-3 pl-3">
      <div className={cn(BOX_CLASS, 'min-h-0 flex-[3] p-3')}>
        <div className="h-full animate-pulse rounded-2xl bg-gray-100" />
      </div>
      <div className={cn(BOX_CLASS, 'min-h-0 flex-[2] px-3 pt-3 pb-2')}>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64 rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-4 w-3/4 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the real tab chrome around skeleton columns, so nothing about the
 * frame moves or swaps when the configuration resolves.
 */
export function ScanConfigSkeleton({
  className,
  activity = ScanConfigActivity.Simulate,
}: {
  className?: string;
  activity?: TScanConfigActivity;
}) {
  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <ScanConfigTabsPanel
        className="min-h-0 flex-1"
        activity={activity}
        tab={toScanConfigTab(activity, BaseScanConfigTabs.configuration)}
        setTab={() => {}}
        disableResultsTab
        disableConfigurationTab={false}
        results={null}
        configuration={
          // As the configuration first lays out (the user asked them to match): the blocks' list alone in a slim
          // window on the left, the form folded away, and the preview spread over the rest, edge to edge with the
          // toolbar's ends (default-columns.tsx's ALONE_TRACKS)
          <div className="flex min-h-0 flex-1 flex-col pt-2 pb-2">
            <div
              className="grid min-h-0 flex-1 gap-1.25 overflow-hidden *:min-w-0"
              style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,0fr) minmax(0,3fr)' }}
            >
              <div className={cn(BOX_CLASS, 'mt-px mb-3 ml-px min-h-0 overflow-hidden py-3')}>
                <LeftColumnSkeleton />
              </div>
              {/* the form's track, folded to nothing */}
              <div aria-hidden />
              {activity === ScanConfigActivity.Simulate ? (
                <BoxedPreviewSkeleton />
              ) : (
                <div className="h-full min-w-0 overflow-auto secondary-scrollbar">
                  <ModelPreviewSkeleton />
                </div>
              )}
            </div>
          </div>
        }
      />
    </div>
  );
}

export default ScanConfigSkeleton;
