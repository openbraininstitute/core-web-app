'use client';

/**
 * loads an existing campaign when `originId` is on the URL (or passed in)
 *
 * plug in a `resolve` function per workflow (simulate, extract, build, ...)
 * `shouldRenderScanConfig` tells when it's OK to show the editor
 * - no campaign id → show it (fresh config)
 * - campaign id → wait until we've got `config.form`
 */

import { useQuery } from '@tanstack/react-query';

import { keyBuilder } from '@/ui/use-query-keys/data';

import type { Config } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

/** campaign payload shape, just need the form blob */
type TCampaignWithFormConfig = {
  config?: {
    form?: Config;
  };
};

export type TUseScanConfigOriginCampaignParams<T extends TCampaignWithFormConfig> = {
  /** from `?originId=`, skip the query when this is missing */
  originId?: string;
  context: WorkspaceContext;
  /** workflow-specific fetcher, e.g. `resolveSimulationByCampaignId` */
  resolve: (args: { id: string; context: WorkspaceContext }) => Promise<T | null>;
  /** set false to pause the query without unmounting, default true */
  enabled?: boolean;
};

/**
 * fetches campaign config for resume/edit flows
 *
 * @returns
 * - `initialConfig`, `config.form` from the campaign, pass into `useScanConfiguration`
 * - `shouldRenderScanConfig`, false while loading an existing campaign that has no form yet
 */
export function useScanConfigOriginCampaign<T extends TCampaignWithFormConfig>({
  originId,
  context,
  resolve,
  enabled = true,
}: TUseScanConfigOriginCampaignParams<T>) {
  const { data, error, isLoading } = useQuery({
    queryKey: originId
      ? keyBuilder.simCampaign({ entityId: originId })
      : ['scan-config-campaign', 'idle', context],
    queryFn: async () => {
      if (!originId) return null;
      return await resolve({ id: originId, context });
    },
    enabled: enabled && !!originId,
  });

  const initialConfig = data?.config?.form ?? (data?.config as Config | undefined);
  const shouldRenderScanConfig = !originId || (!isLoading && Boolean(data));

  return {
    campaignData: data,
    initialConfig,
    error,
    isLoading,
    shouldRenderScanConfig,
  };
}
