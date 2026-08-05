import { LoadingOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { get, isEqual, isString, pick } from 'es-toolkit/compat';

import { authFetch } from '@/auth-fetch';
import { useAppNotification } from '@/components/notification';
import { config as appConfig } from '@/config';
import { useLowCredits } from '@/features/low-credits';
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
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { getTargetType } from '@/ui/segments/workflows/config';
import { assertErrorMessage, classNames } from '@/util/utils';

import type { ErrorObject } from 'ajv';
import type { Config } from '@/features/scan-config/types';

const LOW_CREDITS_SUBJECT: Record<TScanConfigActivity, string> = {
  [ScanConfigActivity.Simulate]: 'run the simulation',
  [ScanConfigActivity.Extract]: 'run the extraction',
  [ScanConfigActivity.Process]: 'run the skeletonization',
  [ScanConfigActivity.Build]: 'build the model',
};

type ObiOneErrorBody = {
  detail?: unknown;
  error_code?: unknown;
  message?: unknown;
  details?: Array<{ msg?: unknown }> | null;
} | null;

/**
 * Pull the human-readable reason out of an obi-one error body.
 *
 * The service answers in two different shapes. FastAPI's `HTTPException` gives `{ detail }`,
 * while its own error envelope — used for rejected configs and for request validation failures —
 * gives `{ error_code, message, details }`, where the specific reason is in `details[0].msg` and
 * `message` may just be a generic "Validation error". Reading only one of the two is why a
 * rejected config surfaced as a bare "Unknown error".
 */
export function errorReason(body: ObiOneErrorBody): string {
  if (isString(body?.detail)) return body.detail;
  if (isString(body?.details?.[0]?.msg)) return body.details[0].msg;
  if (isString(body?.message)) return body.message;
  return 'Unknown error';
}

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
  const queryClient = useQueryClient();
  const {
    guard,
    reportError: reportLowCredits,
    creditsModal,
  } = useLowCredits({
    context: { virtualLabId, projectId },
    subject: LOW_CREDITS_SUBJECT[activity],
    watchBalance: true,
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
    <>
      {creditsModal}
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
          if (guard()) return;

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
              const errorRes = await coordinateCountRes.json();
              if (reportLowCredits(errorRes)) return;

              notification.error({
                message: get(messages, `${activity}.CoordinateCountFailed`),
                description: errorReason(errorRes),
              });
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
              if (reportLowCredits(errorRes)) return;

              notification.error({
                message: get(messages, `${activity}.ScanConfigGenerateGridFailed`),
                description: errorReason(errorRes),
              });
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
    </>
  );
}
