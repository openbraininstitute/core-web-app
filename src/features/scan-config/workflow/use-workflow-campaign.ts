'use client';

import { useScanConfigOriginCampaign } from '@/features/scan-config/components/hooks/use-scan-origin-campaign';
import { ScanConfigOriginSearchParam } from '@/features/scan-config/helpers';

import type {
  TResolvedScanConfigCampaign,
  TScanConfigCampaignSource,
} from '@/features/scan-config/workflow/types';
import type { WorkspaceContext } from '@/types/common';

export function useWorkflowCampaign({
  campaignSource,
  workspace,
  searchParams,
}: {
  campaignSource: TScanConfigCampaignSource;
  workspace: WorkspaceContext;
  searchParams: Record<string, string | string[] | undefined>;
}): TResolvedScanConfigCampaign {
  const searchParam = campaignSource.searchParam ?? ScanConfigOriginSearchParam;
  const raw = searchParams[searchParam];
  const origin = typeof raw === 'string' ? raw : undefined;

  const { campaignData, initialConfig, error, isLoading, shouldRenderScanConfig } =
    useScanConfigOriginCampaign({
      origin,
      context: workspace,
      resolve: campaignSource.resolve,
    });

  return {
    origin,
    initialConfig,
    campaignData,
    isLoading,
    error: error ?? null,
    shouldRender: shouldRenderScanConfig,
  };
}
