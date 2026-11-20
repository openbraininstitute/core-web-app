'use client';

/**
 * loads an existing campaign when `origin` is on the URL (or passed in)
 *
 * plug in a `resolve` function per workflow (simulate, extract, build, ...)
 * `shouldRenderScanConfig` tells when it's OK to show the editor
 * - no campaign id → show it (fresh config)
 * - campaign id → wait until we've got `config.form`
 */

import { useQuery } from '@tanstack/react-query';

import { isPlainObject } from '@/features/scan-config/components/utils';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { Config } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

/** campaign payload shape, just need the form blob */
type CampaignWithFormConfig = {
  config?: {
    form?: Config;
  };
};

/**
 * The form a campaign's own stored config holds, as the editor's form: `{ form: ... }` for a
 * campaign's submitted config, but a single coordinate's own `task_config`/`simulation_generation_config`
 * asset has no `form` wrapper at all; it already *is* the form (a strict subset of the schema).
 */
function formOf(config: unknown): Config | undefined {
  if (!isPlainObject(config)) return undefined;
  const { form } = config;
  return (isPlainObject(form) ? form : config) as Config;
}

export type UseScanConfigOriginCampaignParams<T extends CampaignWithFormConfig> = {
  /** from `?origin=`, skip the query when this is missing */
  origin?: string;
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
export function useScanConfigOriginCampaign<T extends CampaignWithFormConfig>({
  origin,
  context,
  resolve,
  enabled = true,
}: UseScanConfigOriginCampaignParams<T>) {
  const { data, error, isLoading } = useQuery({
    queryKey: origin
      ? keyBuilder.simCampaign({ entityId: origin })
      : ['scan-config-campaign', 'idle', context],
    queryFn: async () => {
      if (!origin) return null;
      return await resolve({ id: origin, context });
    },
    enabled: enabled && !!origin,
  });

  const form = formOf(data?.config);
  const shouldRenderScanConfig = !origin || (Boolean(origin) && !isLoading && Boolean(form));

  return {
    campaignData: data,
    initialConfig: form,
    error,
    isLoading,
    shouldRenderScanConfig,
  };
}
