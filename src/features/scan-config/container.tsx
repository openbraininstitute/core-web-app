'use client';

import { useAtom } from 'jotai';
import { useEffect } from 'react';

import {
  type TUseScanConfigurationParams,
  useScanConfiguration,
} from '@/features/scan-config/components/hooks/use-scan-configuration';
import ScanConfigSkeleton from '@/features/scan-config/components/skeletons/full-page';
import { ScanConfigTemplate } from '@/features/scan-config/template';

import { diffBarDataAtom } from '../ai-assistant/chat/use-last-message-diff-bar';

export type ScanConfigContainerProps = TUseScanConfigurationParams & {
  className?: string;
};

export function ScanConfigContainer(props: ScanConfigContainerProps) {
  const { className, ...configurationParams } = props;
  const { isLoading, error, unresolvedMessage, ready } = useScanConfiguration(configurationParams);
  const [, setDiffBarData] = useAtom(diffBarDataAtom);
  useEffect(() => () => setDiffBarData(null));

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
