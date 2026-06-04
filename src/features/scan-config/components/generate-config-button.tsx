import { LoadingOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { get, isEqual, isString, pick } from 'es-toolkit/compat';

import { authFetch } from '@/auth-fetch';
import { useAppNotification } from '@/components/notification';
import { config as appConfig } from '@/config';
import { useFieldErrors } from '@/features/scan-config/components/hooks/field-errors';
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
import { useCreditsAccessGuard } from '@/hooks/use-credits-access-guard';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getTargetType } from '@/ui/segments/workflows/config';
import { assertErrorMessage, classNames } from '@/util/utils';

import type { ErrorObject } from 'ajv';
import type { Config } from '@/features/scan-config/types';

const LOW_FUNDS_ERROR_CODE = 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR';

// TODO: the credits checks are not straightforward
// it must be a clean way to do it (to be checked in another PR)
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
  const { isVirtualLabAdmin } = useWorkspaceMembership({ virtualLabId });
  const queryClient = useQueryClient();
  const { notifyCredits, shouldShowError } = useCreditsAccessGuard({
    context: { virtualLabId, projectId },
    message: get(messages, `${activity}.ScanConfigGenerateGridFailed`),
    description: get(
      messages,
      `${activity}.InsufficientCreditsNonAdmin`,
      messages[ScanConfigActivity.Simulate].InsufficientCreditsNonAdmin
    ),
  });

  const onTabChange = () => {
    if (activity === ScanConfigActivity.Simulate)
      setTab({
        id: SimulateScanConfigTabs.simulations,
        __activity: ScanConfigActivity.Simulate,
      });
    if (activity === ScanConfigActivity.Extract)
      setTab({
        id: ExtractScanConfigTabs.extractions,
        __activity: ScanConfigActivity.Extract,
      });
    if (activity === ScanConfigActivity.Process)
      setTab({
        id: ProcessScanConfigTabs.skeletonizations,
        __activity: ScanConfigActivity.Process,
      });
    if (activity === ScanConfigActivity.Build)
      setTab({
        id: BuildScanConfigTabs.results,
        __activity: ScanConfigActivity.Build,
      });
  };

  return (
    <button
      type="button"
      className={classNames(
        'flex min-h-12.5 p-2 w-full items-center justify-center rounded-full text-lg drop-shadow',
        hasBlockingErrors || loading
          ? 'bg-gray-300 text-gray-500'
          : 'bg-linear-to-r from-[#003A8C] to-[#001026] text-white'
      )}
      onClick={async () => {
        if (loading) return;
        if (campaignId) {
          setCampaignId('');
          return;
        }
        if (shouldShowError) {
          notifyCredits();
          return;
        }

        setLoading(true);
        try {
          const coordinateCountRes = await authFetch(
            `${appConfig.OBI_ONE_URL}/declared/scan_config/grid-scan-coordinate-count`,
            {
              method: 'POST',
              body: JSON.stringify(config),
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'virtual-lab-id': virtualLabId,
                'project-id': projectId,
              },
            }
          );

          if (!coordinateCountRes.ok) {
            const message = await coordinateCountRes.json();
            const detailStr = typeof message?.detail === 'string' ? message.detail : '';
            const isLowFunds =
              message?.error_code === LOW_FUNDS_ERROR_CODE ||
              detailStr.toLowerCase().includes('insufficient') ||
              detailStr.toLowerCase().includes('credits');

            if (isLowFunds && !isVirtualLabAdmin) {
              notifyCredits();
            } else {
              notification.error({
                message: get(messages, `${activity}.CoordinateCountFailed`),
                description: detailStr || (message?.detail ?? 'Unknown error'),
              });
            }
            return;
          }

          const res = await authFetch(generatedApiUrl, {
            method: 'POST',
            body: JSON.stringify(config),
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'virtual-lab-id': virtualLabId,
              'project-id': projectId,
            },
          });

          if (res.status !== 200) {
            const errorRes = await res.json();

            const isLowFundsFromApi =
              errorRes?.error_code === LOW_FUNDS_ERROR_CODE ||
              (typeof errorRes?.detail === 'string' &&
                (errorRes.detail.toLowerCase().includes('insufficient') ||
                  errorRes.detail.toLowerCase().includes('credits')));

            // When non-admin gets any error: show credits message. Backend may return
            // misleading errors (sonata_circuit, no calibration result, etc.) when
            // the real issue is insufficient credits.
            const shouldShowCreditsMessage = isLowFundsFromApi && !isVirtualLabAdmin;

            if (shouldShowCreditsMessage) {
              notifyCredits();
            } else {
              const details =
                res.status === 500 ? errorRes.detail : (errorRes?.details?.[0].msg ?? '');
              notification.error({
                message: get(messages, `${activity}.ScanConfigGenerateGridFailed`),
                description: details,
              });
            }
            return;
          }

          const returnedCampaignId = (await res.json()) as string;
          if (returnedCampaignId === '') {
            notification.error({
              message: get(messages, `${activity}.ScanConfigGenerateGridCampaignIdFailed`),
            });
            return;
          }
          queryClient.invalidateQueries({
            predicate: (query) => {
              const baseQueryKey = query.queryKey.at(0);
              const filtersQueryKey = query.queryKey.at(1);
              if (
                isString(baseQueryKey) &&
                baseQueryKey.startsWith('workspace/activities') &&
                isEqual(
                  pick(filtersQueryKey, ['virtualLabId', 'projectId', 'activity', 'entityType']),
                  {
                    virtualLabId,
                    projectId,
                    activity,
                    entityType: getTargetType({ activity, sourceType: entityType }),
                  }
                )
              ) {
                return true;
              }
              return false;
            },
          });
          setCampaignId(returnedCampaignId);
          onTabChange();
        } catch (e) {
          notification.error({ message: assertErrorMessage(e) });
          return;
        } finally {
          setLoading(false);
        }
      }}
      disabled={hasBlockingErrors || loading}
    >
      <div className="flex justify-between gap-5">
        {!campaignId
          ? get(messages, `${activity}.Generate`, 'Generate campaign')
          : get(messages, `${activity}.New`, 'New campaign')}
        {loading && <LoadingOutlined />}
      </div>
    </button>
  );
}
