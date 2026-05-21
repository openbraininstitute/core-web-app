'use client';

import {
  type TUseScanConfigurationParams,
  useScanConfiguration,
} from '@/features/scan-config/components/hooks/use-scan-configuration';
import ScanConfigSkeleton from '@/features/scan-config/components/skeletons/full-page';
import { ScanConfigTemplate } from '@/features/scan-config/template';

export type ScanConfigContainerProps = TUseScanConfigurationParams & {
  className?: string;
};

export function ScanConfigContainer(props: ScanConfigContainerProps) {
  const { className, ...configurationParams } = props;
  const { isLoading, error, unresolvedMessage, ready } = useScanConfiguration(configurationParams);

  if (isLoading) {
    return <ScanConfigSkeleton />;
  }

  if (error) {
    return <div className="flex h-full w-full items-center justify-center">{error.message}</div>;
  }

  if (unresolvedMessage) {
    return (
      <div className="flex h-full w-full items-center justify-center">{unresolvedMessage}</div>
    );
  }

  if (!ready) {
    return null;
  }

  return <ScanConfigTemplate {...ready} className={className} />;
}
