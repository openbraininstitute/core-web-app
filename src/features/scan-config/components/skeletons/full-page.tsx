'use client';

import { useSearchParams } from 'next/navigation';

import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import ScanConfigTabsPanel, { toScanConfigTab } from '@/features/scan-config/components/tabs';
import { ScanConfigTabSearchParam } from '@/features/scan-config/helpers';
import {
  BaseScanConfigTabs,
  ScanConfigActivity,
  ScanConfigTabs,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
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

function MiddleColumnSkeleton() {
  return (
    <div
      className={cn(
        styles.scrollable,
        'h-full overflow-y-auto no-scrollbar border-l border-gray-200 px-3'
      )}
    >
      <div className="space-y-4 flex flex-col gap-4">
        <div className="space-y-2 mb-10">
          <Skeleton className="h-3 w-48 rounded-full" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-3/4 rounded-full" />
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
/** The overview's frame while it loads: its header, and its columns of cards. */
function OverviewSkeleton() {
  const column = (cards: number, height: string) => (
    <div className="flex flex-col justify-center gap-6">
      {Array.from({ length: cards }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: placeholders in a fixed order
        <Skeleton key={i} className={cn('w-56 rounded-xl', height)} />
      ))}
    </div>
  );
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden pt-2 pb-2">
      <div className="flex h-full w-full flex-col rounded-2xl bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <Skeleton className="h-6 w-56 rounded-full" />
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center gap-16">
          {column(2, 'h-48')}
          {column(3, 'h-28')}
          {column(1, 'h-32')}
          {column(2, 'h-48')}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the real tab chrome around skeleton columns, so nothing about the
 * frame moves or swaps when the configuration resolves: the same tabs, the overview's among
 * them where the campaign has one, and the one the page opens on already picked.
 */
export function ScanConfigSkeleton({
  className,
  activity = ScanConfigActivity.Simulate,
  defaultTab,
  hasCampaign = false,
  withOverview = false,
}: {
  className?: string;
  activity?: TScanConfigActivity;
  /** The tab the page opens on, once it has a campaign. */
  defaultTab?: TScanConfigTabs;
  hasCampaign?: boolean;
  withOverview?: boolean;
}) {
  // as the template resolves it: the URL's tab, else the page's default; without a campaign, its
  // configuration
  // no search params outside the app router
  const asked = useSearchParams()?.get(ScanConfigTabSearchParam);
  const known = Object.values(ScanConfigTabs[activity]) as string[];
  const opening =
    hasCampaign && asked && known.includes(asked)
      ? asked
      : hasCampaign && defaultTab
        ? defaultTab.id
        : BaseScanConfigTabs.configuration;
  const onOverview = opening === SimulateScanConfigTabs.overview && withOverview;
  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <ScanConfigTabsPanel
        className="min-h-0 flex-1"
        activity={activity}
        tab={toScanConfigTab(activity, onOverview ? opening : BaseScanConfigTabs.configuration)}
        setTab={() => {}}
        disableResultsTab
        disableConfigurationTab={false}
        hasOverview={withOverview}
        // without a campaign there is no overview yet: disabled, as the page will have it
        overview={hasCampaign ? <OverviewSkeleton /> : undefined}
        results={null}
        configuration={
          // As the configuration lays out: the blocks and their form in one window, the preview
          // beside it, edge to edge with the toolbar's ends.
          <div className="flex min-h-0 flex-1 flex-col pt-2 pb-2">
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-1.25 overflow-hidden *:min-w-0">
              <div
                className={cn(
                  BOX_CLASS,
                  'col-span-2 mt-px mb-3 ml-px grid min-h-0 grid-cols-subgrid grid-rows-1 gap-x-0 overflow-hidden py-3'
                )}
              >
                <LeftColumnSkeleton />
                <MiddleColumnSkeleton />
              </div>
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
