'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useRouter } from '@bprogress/next';
import { get } from 'es-toolkit/compat';
import { useState } from 'react';

import { useAppNotification } from '@/components/notification';
import { useFlags } from '@/features/feature-flags';
import { ScanConfigCampaignOriginActionDict } from '@/features/scan-config/helpers';
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
export default function CopyCampaignButton({
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
      data-testid="scan-config-copy-campaign"
      className={classNames(
        'flex min-h-12.5 p-2 w-full items-center justify-center rounded-full text-lg drop-shadow',
        loading
          ? 'bg-gray-300 text-gray-500'
          : 'bg-linear-to-r from-[#003A8C] to-primary-10 text-white'
      )}
      onClick={onClick}
      disabled={loading}
    >
      <div className="flex justify-between gap-5">
        {get(messages, `${activity}.CopyCampaign`, 'Generate new campaign')}
        {loading && <LoadingOutlined />}
      </div>
    </button>
  );
}
