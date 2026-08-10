import { isEmpty } from 'es-toolkit/compat';

import { getEntityCoreContext } from '@/api/entitycore/utils';
import {
  obioneApi,
  ScanConfigGenerationError,
  ScanConfigGenerationStep,
  toObiOneErrorBody,
} from '@/api/one/utils';
import { config as appConfig } from '@/config';

import type { WorkspaceContext } from '@/types/common';

type TGenerateScanConfigCampaignParams = {
  ctx: WorkspaceContext;
  config: unknown;
  generatedApiUrl: string;
};

/**
 * Generates a scan-config campaign: validates the grid size first
 * (grid-scan-coordinate-count), then launches generation and returns the campaign id.
 *
 * Throws {@link ScanConfigGenerationError} tagged with the failing step.
 */
export async function generateScanConfigCampaign({
  ctx,
  config,
  generatedApiUrl,
}: TGenerateScanConfigCampaignParams): Promise<string> {
  const api = await obioneApi();
  const headers = {
    ...getEntityCoreContext(ctx).headers,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    await api.post('/declared/scan_config/grid-scan-coordinate-count', {
      headers,
      body: config,
    });
  } catch (error) {
    throw new ScanConfigGenerationError(
      ScanConfigGenerationStep.CoordinateCount,
      toObiOneErrorBody(error)
    );
  }

  // generatedApiUrl arrives absolute (buildGeneratedApiUrl); the client prepends OBI_ONE_URL.
  const obioneUrl = appConfig.OBI_ONE_URL;
  const generatedPath = obioneUrl ? generatedApiUrl.replace(obioneUrl, '') : generatedApiUrl;

  let campaignId: string;
  try {
    campaignId = await api.post<string>(generatedPath, { headers, body: config });
  } catch (error) {
    throw new ScanConfigGenerationError(
      ScanConfigGenerationStep.Generation,
      toObiOneErrorBody(error)
    );
  }

  if (isEmpty(campaignId)) {
    throw new ScanConfigGenerationError(ScanConfigGenerationStep.EmptyCampaignId);
  }

  return campaignId;
}
