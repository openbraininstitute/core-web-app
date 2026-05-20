'use client';

import { useScanConfigOriginCampaign } from '@/features/scan-config/components/hooks/use-scan-origin-campaign';

import type {
  TResolvedScanConfigCampaign,
  TScanConfigCampaignSource,
} from '@/features/scan-config/workflow/types';
import type { WorkspaceContext } from '@/types/common';

const DEFAULT_CAMPAIGN_SEARCH_PARAM = 'initialCampaignId';

export function useWorkflowCampaign({
  campaignSource,
  workspace,
  searchParams,
}: {
  campaignSource: TScanConfigCampaignSource;
  workspace: WorkspaceContext;
  searchParams: Record<string, string | string[] | undefined>;
}): TResolvedScanConfigCampaign {
  const searchParam = campaignSource.searchParam ?? DEFAULT_CAMPAIGN_SEARCH_PARAM;
  const raw = searchParams[searchParam];
  const initialCampaignId = typeof raw === 'string' ? raw : undefined;

  const { campaignData, initialConfig, error, isLoading, shouldRenderScanConfig } =
    useScanConfigOriginCampaign({
      initialCampaignId,
      context: workspace,
      resolve: campaignSource.resolve,
    });

  return {
    initialCampaignId,
    initialConfig,
    campaignData,
    isLoading,
    error: error ?? null,
    shouldRender: shouldRenderScanConfig,
  };
}
