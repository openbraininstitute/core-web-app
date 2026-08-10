import { LoadingOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';

import { ScanConfigGenerationError, ScanConfigGenerationStep } from '@/api/one/utils';
import { useAppNotification } from '@/components/notification';
import { useLowCredits } from '@/features/low-credits';
import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
import { useGenerateScanConfigCampaign } from '@/features/scan-config/components/hooks/use-generate-scan-config-campaign';
import {
  BuildScanConfigTabs,
  ExtractScanConfigTabs,
  ProcessScanConfigTabs,
  ScanConfigActivity,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
  type TSupportedEntityTypesForScanConfiguration,
} from '@/features/scan-config/types';
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { assertErrorMessage, classNames } from '@/util/utils';

import type { ErrorObject } from 'ajv';
import type { Config } from '@/features/scan-config/types';

const LOW_CREDITS_SUBJECT: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'run the simulation',
  [ScanConfigActivity.Extract]: 'run the extraction',
  [ScanConfigActivity.Process]: 'run the skeletonization',
  [ScanConfigActivity.Build]: 'build the model',
};

const FAILURE_MESSAGE_KEY: Record<string, string> = {
  [ScanConfigGenerationStep.CoordinateCount]: 'CoordinateCountFailed',
  [ScanConfigGenerationStep.Generation]: 'ScanConfigGenerateGridFailed',
  [ScanConfigGenerationStep.EmptyCampaignId]: 'ScanConfigGenerateGridCampaignIdFailed',
};

const ACTIVITY_RESULTS_TAB: Record<TScanConfigActivity, TScanConfigTabs> = {
  [ScanConfigActivity.Simulate]: {
    id: SimulateScanConfigTabs.simulations,
    __activity: ScanConfigActivity.Simulate,
  },
  [ScanConfigActivity.Extract]: {
    id: ExtractScanConfigTabs.extractions,
    __activity: ScanConfigActivity.Extract,
  },
  [ScanConfigActivity.Process]: {
    id: ProcessScanConfigTabs.skeletonizations,
    __activity: ScanConfigActivity.Process,
  },
  [ScanConfigActivity.Build]: {
    id: BuildScanConfigTabs.results,
    __activity: ScanConfigActivity.Build,
  },
};

export default function GenerateConfigButton({
  loading,
  errors,
  campaignId,
  setCampaignId,
  setLoading,
  config,
  setTab,
  activity,
  generatedApiUrl,
  entityType,
}: {
  loading: boolean;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  campaignId: string;
  setCampaignId: (campaignId: string) => void;
  setLoading: (loading: boolean) => void;
  config: Config;
  setTab: React.Dispatch<React.SetStateAction<TScanConfigTabs>>;
  activity: TScanConfigActivity;
  generatedApiUrl: string;
  entityType: TSupportedEntityTypesForScanConfiguration;
}) {
  const { projectId, virtualLabId } = useWorkspace();
  // ajv schema errors plus field-level errors (e.g. duplicate group names) that
  // schema validation can't catch; either kind blocks generation
  const fieldErrors = useFieldErrors();
  const hasBlockingErrors = (!!errors && errors.length > 0) || fieldErrors.size > 0;
  const notification = useAppNotification();
  const {
    guard,
    reportError: reportLowCredits,
    creditsModal,
  } = useLowCredits({
    context: { virtualLabId, projectId },
    subject: LOW_CREDITS_SUBJECT[activity],
    watchBalance: true,
  });

  const generateCampaign = useGenerateScanConfigCampaign({
    ctx: { virtualLabId, projectId },
    activity,
    entityType,
    onSuccess: (newCampaignId) => {
      setCampaignId(newCampaignId);
      setTab(ACTIVITY_RESULTS_TAB[activity]);
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

  const onClick = () => {
    if (loading || generateCampaign.isPending) return;
    if (campaignId) {
      setCampaignId('');
      return;
    }
    if (guard()) return;

    setLoading(true);
    generateCampaign.mutate({ config, generatedApiUrl }, { onSettled: () => setLoading(false) });
  };

  return (
    <>
      {creditsModal}
      <button
        type="button"
        className={classNames(
          'flex min-h-12.5 p-2 w-full items-center justify-center rounded-full text-lg drop-shadow',
          hasBlockingErrors || loading
            ? 'bg-gray-300 text-gray-500'
            : 'bg-linear-to-r from-[#003A8C] to-primary-10 text-white'
        )}
        onClick={onClick}
        disabled={hasBlockingErrors || loading}
      >
        <div className="flex justify-between gap-5">
          {!campaignId
            ? get(messages, `${activity}.Generate`, 'Generate campaign')
            : get(messages, `${activity}.New`, 'New campaign')}
          {loading && <LoadingOutlined />}
        </div>
      </button>
    </>
  );
}
