'use client';

import {
  type TUseScanConfigurationParams,
  useScanConfiguration,
} from '@/features/scan-config/components/hooks/use-scan-configuration';
import ScanConfigSkeleton from '@/features/scan-config/components/skeletons/full-page';
import { ScanConfigTopBar } from '@/features/scan-config/components/top-bar/context';
import { ScanConfigTemplate } from '@/features/scan-config/template';
import { DownloadPanel } from '@/ui/segments/explore/circuit/elements/download-panel';

import type { ReactNode } from 'react';

export type ScanConfigContainerProps = TUseScanConfigurationParams & {
  className?: string;
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
  const { className, ...configurationParams } = props;
  const { isLoading, error, unresolvedMessage, ready } = useScanConfiguration(configurationParams);

  if (isLoading) {
    return <ScanConfigSkeleton activity={configurationParams.activity} className={className} />;
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
      <ScanConfigTemplate {...ready} className={className} />
      <DownloadPanel />
    </>
  );
}
