'use client';

import { useModelQuery } from '@/features/scan-config/components/atoms';
import type { Config } from '@/features/scan-config/components/components';
import { ScanConfigSkeleton } from '@/features/scan-config/components/loading-skeleton';
import { ScanConfigTemplate } from '@/features/scan-config/template';
import {
  ScanConfigActivity,
  ScanConfigDefaultTab,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';

export default function ScanConfiguration({
  modelId,
  virtualLabId,
  projectId,
  initialCampaignId,
  initialConfig,
  defaultTab = ScanConfigDefaultTab,
  readOnly,
  className,
  activity = ScanConfigActivity.Simulate,
}: {
  modelId: string;
  virtualLabId: string;
  projectId: string;
  initialCampaignId?: string;
  initialConfig?: Config;
  defaultTab?: TScanConfigTabs;
  readOnly?: boolean;
  className?: string;
  activity?: TScanConfigActivity;
}) {
  const { entity, isLoading, error } = useModelQuery({
    id: modelId,
    context: { virtualLabId, projectId },
  });

  if (isLoading) {
    return <ScanConfigSkeleton />;
  }

  if (error) {
    return <div className="h-full w-full flex items-center justify-center">{error.message}</div>;
  }

  if (entity) {
    return (
      <ScanConfigTemplate
        {...{
          entity,
          virtualLabId,
          projectId,
          initialCampaignId,
          initialConfig,
          defaultTab,
          readOnly,
          className,
          activity,
        }}
      />
    );
  }
  return null;
}
