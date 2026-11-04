'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useScanConfigOriginCampaign } from '@/features/scan-config/components/hooks/use-scan-origin-campaign';
import { ScanConfigOriginSearchParam } from '@/features/scan-config/helpers';
import { findWorkflowOfStoredForm } from '@/features/scan-config/workflow/find-descriptor';
import { swapWorkflowInConfigurePath } from '@/ui/segments/workflows/config/routes';

import type {
  TResolvedScanConfigCampaign,
  TScanConfigCampaignSource,
} from '@/features/scan-config/workflow/types';
import type { WorkspaceContext } from '@/types/common';
import type { TScanConfigRegistryConfig } from '@/ui/segments/workflows/config/scan-config-binding';

export function useWorkflowCampaign({
  campaignSource,
  scanConfig,
  workspace,
  searchParams,
}: {
  campaignSource: TScanConfigCampaignSource;
  scanConfig: TScanConfigRegistryConfig;
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

  const router = useRouter();
  const pathname = usePathname();
  const formWorkflow = campaignSource.formTypeNamesWorkflow
    ? findWorkflowOfStoredForm({ form: initialConfig, schemaName: scanConfig.schemaName })
    : null;
  const formWorkflowPath =
    formWorkflow && scanConfig.targetType
      ? swapWorkflowInConfigurePath({
          pathname,
          from: scanConfig.targetType,
          to: formWorkflow.targetType,
        })
      : null;

  useEffect(() => {
    if (formWorkflowPath) router.replace(`${formWorkflowPath}${window.location.search}`);
  }, [formWorkflowPath, router]);

  return {
    origin,
    initialConfig,
    campaignData,
    isLoading,
    error: error ?? null,
    // the editor must not mount on a form that belongs to another workflow
    shouldRender: shouldRenderScanConfig && !formWorkflowPath,
  };
}
