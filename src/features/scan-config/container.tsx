'use client';

import {
  type TUseScanConfigurationParams,
  useScanConfiguration,
} from '@/features/scan-config/components/hooks/use-scan-configuration';
import ScanConfigSkeleton from '@/features/scan-config/components/skeletons/full-page';
import { ScanConfigTopBar } from '@/features/scan-config/components/top-bar/context';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { hasOverview } from '@/features/scan-config/overview/availability';
import { ScanConfigTemplate } from '@/features/scan-config/template';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';

import type { ReactNode } from 'react';

export type ScanConfigContainerProps = TUseScanConfigurationParams & {
  className?: string;
  /** show only the configuration, without the tab strip */
  hideTabs?: boolean;
};

/**
 * Error / unresolved / not-ready states have no tab rail, so the host's breadcrumb (and close)
 * keep their usual row above the message instead of disappearing with the template.
 */
function ScanConfigFallback({ children }: { children?: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <ScanConfigTopBar />
      <div className="flex min-h-0 flex-1 items-center justify-center">{children}</div>
    </div>
  );
}

export function ScanConfigContainer(props: ScanConfigContainerProps) {
  const { className, hideTabs, ...configurationParams } = props;
  const { isLoading, error, unresolvedMessage, ready } = useScanConfiguration(configurationParams);

  if (isLoading) {
    const {
      activity = ScanConfigActivity.Simulate,
      origin,
      campaignOriginAction,
    } = configurationParams;
    return (
      <ScanConfigSkeleton
        activity={activity}
        className={className}
        defaultTab={configurationParams.defaultTab}
        // a duplicate opens as a new, unsaved campaign
        hasCampaign={
          Boolean(origin) && campaignOriginAction !== ScanConfigCampaignOriginActionDict.Duplicate
        }
        withOverview={
          !hideTabs && hasOverview(activity, Boolean(configurationParams.taskTypeBindings))
        }
      />
    );
  }

  if (error) {
    return <ScanConfigFallback>{error.message}</ScanConfigFallback>;
  }

  if (unresolvedMessage) {
    return <ScanConfigFallback>{unresolvedMessage}</ScanConfigFallback>;
  }

  if (!ready) {
    return <ScanConfigFallback />;
  }

  return (
    <>
      <ScanConfigTemplate {...ready} className={className} hideTabs={hideTabs} />
      <DownloadPanel />
    </>
  );
}
