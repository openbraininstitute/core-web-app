'use client';

import { LegacyCampaignStatusCell } from '@/features/task-runner/activity-execution/legacy-status-cell';

import type { CellRendererProps } from '../../../react';

/** Cell-renderer registry key for the campaign/simulation aggregated status cell. */
export const CAMPAIGN_STATUS_RENDERER = 'campaignStatus';

/**
 * Collapsed-row "Status" cell for simulation-campaign listings, reusing the exact
 * legacy {@link LegacyCampaignStatusCell} (aggregated activity status, polled while
 * PENDING/RUNNING). The cell keys on the row id — the campaign id — and reads the
 * workspace from context internally, so no extra wiring is needed. This mirrors the
 * legacy `EntityCoreFields.LegacyActivityStatus` field renderer.
 */
export function CampaignStatusCell({ row }: CellRendererProps<{ id?: string | null }>) {
  const campaignId = row?.id;
  if (!campaignId) return null;
  return <LegacyCampaignStatusCell campaignId={campaignId} />;
}
