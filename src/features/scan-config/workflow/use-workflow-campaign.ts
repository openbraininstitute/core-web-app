'use client';

import { useScanConfigOriginCampaign } from '@/features/scan-config/components/hooks/use-scan-origin-campaign';
import { SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM } from '@/features/scan-config/workflow/constants';

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
  const searchParam = campaignSource.searchParam ?? SCAN_CONFIG_ORIGIN_ID_SEARCH_PARAM;
  const raw = searchParams[searchParam];
  const originId = typeof raw === 'string' ? raw : undefined;

  const { campaignData, initialConfig, error, isLoading, shouldRenderScanConfig } =
    useScanConfigOriginCampaign({
      originId,
      context: workspace,
      resolve: campaignSource.resolve,
    });

  return {
    originId,
    initialConfig,
    campaignData,
    isLoading,
    error: error ?? null,
    shouldRender: shouldRenderScanConfig,
  };
}
