'use client';

import { LoadingOutlined, WarningFilled } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { Tooltip } from 'antd';
import { get } from 'es-toolkit/compat';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { isLegacyMigratedEmodel } from '@/entity-configuration/domain/optimization/legacy-migrated-emodels';
import { useFlags } from '@/features/feature-flags';
import { GENERATE_CLICKABLE } from '@/features/scan-config/components/generate-config-button';
import { LAUNCH_GREEN } from '@/features/scan-config/components/shared/task-launch-button';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  resolveWorkflowConfigureHrefForEntity,
  WorkflowConfigureOutcomeDict,
} from '@/ui/segments/workflows/config/entity-entry';
import { classNames } from '@/util/utils';

import type { TScanConfigActivity } from '@/features/scan-config/types';

/**
 * Reopens a read-only campaign as a new, editable duplicate in the workflows editor — the same
 * `?origin=<id>&mode=duplicate` flow the workflow activities table's "Duplicate" row action uses.
 */
export default function GenerateNewCampaignButton({
  campaignId,
  activity,
}: {
  campaignId: string;
  activity: TScanConfigActivity;
}) {
  const router = useRouter();
  const flags = useFlags();
  const { virtualLabId, projectId } = useWorkspace();
  const { error: notifyError } = useAppNotification();
  const [loading, setLoading] = useState(false);
  // The data-view route (`.../data/view/[type]/[id]/[section]`) puts the viewed entity's own id
  // here; reading it directly, rather than threading it down through scan-config's props, keeps
  // this one-off warning self-contained to this button. The near-identical workflows-view route
  // (`.../workflows/(data)/view/[type]/[id]/[section]`) can render this same button for the same
  // e-model, but the warning is data-view only, so it's gated on the path too.
  const pathname = usePathname();
  const { id: viewedEntityId } = useParams<{ id?: string }>();
  const showLegacyMigrationWarning =
    !!pathname?.includes('/data/view/') &&
    activity === ScanConfigActivity.Optimize &&
    isLegacyMigratedEmodel(viewedEntityId);

  const onClick = () => {
    if (loading) return;

    setLoading(true);
    void resolveWorkflowConfigureHrefForEntity({
      entityId: campaignId,
      workspace: { virtualLabId, projectId },
      flags,
      mode: ScanConfigCampaignOriginActionDict.Duplicate,
    })
      .then((result) => {
        if (result.outcome === WorkflowConfigureOutcomeDict.Resolved) {
          router.push(result.href);
          return;
        }

        notifyError({
          message: 'Could not generate a new campaign',
          description:
            result.outcome === WorkflowConfigureOutcomeDict.LifecycleBlocked
              ? result.reason
              : 'No workflow configuration could be opened for this campaign.',
        });
      })
      .catch(() => {
        notifyError({ message: 'Could not generate a new campaign' });
      })
      .finally(() => setLoading(false));
  };

  return (
    <button
      type="button"
      data-testid="scan-config-generate-new-campaign"
      className={classNames(
        // As the generate button an editable configuration has.
        'flex min-h-12.5 p-2 w-full items-center justify-center rounded-full text-sm font-semibold ring-1 ring-black/5',
        loading ? 'bg-gray-300 text-gray-500' : `${LAUNCH_GREEN} ${GENERATE_CLICKABLE} text-white`
      )}
      onClick={onClick}
      disabled={loading}
    >
      <div className="flex items-center justify-between gap-5">
        {get(messages, `${activity}.GenerateNewCampaign`, 'Generate new campaign')}
        {showLegacyMigrationWarning && (
          <Tooltip title="This e-model's campaign was reconstructed from its original optimisation export, not captured live, so the underlying e-feature data may be incomplete. A new optimisation run may not reproduce the original e-model's result.">
            <WarningFilled
              className="text-yellow-400!"
              data-testid="scan-config-generate-new-campaign-legacy-warning"
            />
          </Tooltip>
        )}
        {loading && <LoadingOutlined />}
      </div>
    </button>
  );
}
