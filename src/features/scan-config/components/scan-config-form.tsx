import { get } from 'es-toolkit/compat';

import { ScanConfigGenerationError, ScanConfigGenerationStep } from '@/api/one/utils';
import { useAppNotification } from '@/components/notification';
import { useLowCredits } from '@/features/low-credits';
import { useGenerateScanConfigCampaign } from '@/features/scan-config/components/hooks/use-generate-scan-config-campaign';
import { ScanConfigResultsTab } from '@/features/scan-config/helpers';
import {
  ScanConfigActivity,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { useGetConfig, useHasIssues } from '@/features/scan-config/use-config-store';
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { assertErrorMessage } from '@/util/utils';

import type { FormEvent, KeyboardEvent, ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

const LOW_CREDITS_SUBJECT: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'run the simulation',
  [ScanConfigActivity.Extract]: 'run the extraction',
  [ScanConfigActivity.Process]: 'run the skeletonization',
  [ScanConfigActivity.Build]: 'build the model',
  [ScanConfigActivity.Optimize]: 'run the optimization',
  [ScanConfigActivity.Validate]: 'run the validation',
};

const FAILURE_MESSAGE_KEY: Record<string, string> = {
  [ScanConfigGenerationStep.CoordinateCount]: 'CoordinateCountFailed',
  [ScanConfigGenerationStep.Generation]: 'ScanConfigGenerateGridFailed',
  [ScanConfigGenerationStep.EmptyCampaignId]: 'ScanConfigGenerateGridCampaignIdFailed',
};

/** Enter in a one-line input would submit the form; only the Generate button may do that. */
function keepEnterFromSubmitting(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
}

/**
 * The configuration form. Submitting it generates the campaign from the latest config, or, when a
 * campaign exists, clears it to start a new one. `GenerateConfigButton` is its submit button.
 */
export function ScanConfigForm({
  loading,
  campaignId,
  setCampaignId,
  setLoading,
  setTab,
  activity,
  generatedApiUrl,
  entityType,
  campaignEntityType,
  className,
  children,
}: {
  loading: boolean;
  campaignId: string;
  setCampaignId: (campaignId: string) => void;
  setLoading: (loading: boolean) => void;
  setTab: (tab: TScanConfigTabs) => void;
  activity: TScanConfigActivity;
  generatedApiUrl: string;
  entityType: TSupportedEntityTypesForScanConfiguration;
  campaignEntityType?: TExtendedEntitiesTypeDict;
  className?: string;
  children: ReactNode;
}) {
  const { projectId, virtualLabId } = useWorkspace();
  const hasBlockingErrors = useHasIssues('');
  const getConfig = useGetConfig();
  const notification = useAppNotification();
  // Generation doesn't consume credits (issue #250): don't gate on balance.
  const { reportError: reportLowCredits, creditsModal } = useLowCredits({
    context: { virtualLabId, projectId },
    subject: LOW_CREDITS_SUBJECT[activity],
  });

  const generateCampaign = useGenerateScanConfigCampaign({
    ctx: { virtualLabId, projectId },
    activity,
    entityType,
    campaignEntityType,
    onSuccess: (newCampaignId) => {
      setCampaignId(newCampaignId);
      setTab(ScanConfigResultsTab[activity]);
    },
    onError: (error) => {
      if (!(error instanceof ScanConfigGenerationError)) {
        notification.error({ message: assertErrorMessage(error) });
        return;
      }
      if (reportLowCredits(error.body)) return;

      notification.error({
        message: get(messages, `${activity}.${FAILURE_MESSAGE_KEY[error.step]}`),
        description:
          error.step === ScanConfigGenerationStep.EmptyCampaignId ? undefined : error.message,
      });
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || generateCampaign.isPending || hasBlockingErrors) return;
    if (campaignId) {
      setCampaignId('');
      return;
    }

    setLoading(true);
    generateCampaign.mutate(
      { config: getConfig(), generatedApiUrl },
      { onSettled: () => setLoading(false) }
    );
  };

  return (
    <form
      aria-label="Configuration"
      className={className}
      noValidate
      onSubmit={onSubmit}
      onKeyDown={keepEnterFromSubmitting}
    >
      {creditsModal}
      {children}
    </form>
  );
}
