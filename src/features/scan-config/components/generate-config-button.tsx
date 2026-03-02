import { LoadingOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { get } from 'es-toolkit/compat';

import { listVirtualLabMembers } from '@/api/virtual-lab-svc/queries/member';
import authFetch from '@/auth-fetch';
import { useAppNotification } from '@/components/notification';
import { config as appConfig } from '@/config';
import {
  ExtractScanConfigTabs,
  ScanConfigActivity,
  SimulateScanConfigTabs,
  type TScanConfigActivity,
  type TScanConfigTabs,
} from '@/features/scan-config/types';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { messages } from '@/i18n/en/scan-config';
import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { assertErrorMessage, classNames } from '@/util/utils';

import { useApiUrl } from './hooks';

import type { ErrorObject } from 'ajv';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { Config } from './components';

const LOW_FUNDS_ERROR_CODE = 'ACCOUNTING_INSUFFICIENT_FUNDS_ERROR';

export default function GenerateConfigButton({
  loading,
  errors,
  campaignId,
  setCampaignId,
  setLoading,
  config,
  model,
  setTab,
  activity,
}: {
  loading: boolean;
  errors: ErrorObject<string, Record<string, any>, unknown>[] | null | undefined;
  campaignId: string;
  setCampaignId: (campaignId: string) => void;
  setLoading: (loading: boolean) => void;
  config: Config;
  model: ICircuit | IMEModel;
  setTab: React.Dispatch<React.SetStateAction<TScanConfigTabs>>;
  activity: TScanConfigActivity;
}) {
  const { projectId, virtualLabId } = useWorkspace();
  const notification = useAppNotification();
  const apiUrl = useApiUrl({ model, activity });
  const { isVirtualLabAdmin } = useWorkspaceMembership({ virtualLabId });

  const { data: balanceData } = useQuery({
    queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
    queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
    enabled: !!virtualLabId && !!projectId,
  });

  const { data: membersData } = useQuery({
    queryKey: keyBuilder.listVirtualLabTeam({ virtualLabId }),
    queryFn: () => listVirtualLabMembers({ virtualLabId }),
    enabled: !!virtualLabId && !isVirtualLabAdmin,
  });

  const adminEmailFromQuery = membersData?.data?.users.find((user) => user.role === 'admin')?.email;

  const showInsufficientCreditsError = async () => {
    const msg = get(
      messages,
      `${activity}.InsufficientCreditsNonAdmin`,
      messages[ScanConfigActivity.Simulate].InsufficientCreditsNonAdmin
    );
    let adminEmail = adminEmailFromQuery;
    if (!adminEmail && virtualLabId) {
      try {
        const members = await listVirtualLabMembers({ virtualLabId });
        adminEmail = members?.data?.users.find((user) => user.role === 'admin')?.email;
      } catch {
        // ignore
      }
    }
    notification.error({
      message: get(messages, `${activity}.ScanConfigGenerateGridFailed`),
      description: (
        <div className="flex flex-col gap-2">
          <p>{msg}</p>
          {adminEmail ? (
            <a
              href={`mailto:${adminEmail}?subject=Insufficient%20credits%20for%20simulation`}
              className="text-primary-8 border-neutral-300 inline-flex w-fit rounded-full border px-4 py-1.5 no-underline hover:underline"
            >
              Contact administrator
            </a>
          ) : (
            <p className="text-sm text-gray-600">
              Contact your virtual lab administrator to request credits.
            </p>
          )}
        </div>
      ),
      placement: 'topRight',
      duration: 0,
    });
  };

  const onTabChange = () => {
    if (activity === ScanConfigActivity.Simulate)
      setTab({ id: SimulateScanConfigTabs.simulations, __activity: ScanConfigActivity.Simulate });
    if (activity === ScanConfigActivity.Extract)
      setTab({ id: ExtractScanConfigTabs.extractions, __activity: ScanConfigActivity.Extract });
  };
  return (
    <button
      type="button"
      className={classNames(
        'flex min-h-12.5 w-[95%] items-center justify-center rounded-full text-lg drop-shadow',
        (errors && errors.length > 0) || loading
          ? 'bg-gray-300 text-gray-500'
          : 'bg-linear-to-r from-[#003A8C] to-[#001026] text-white'
      )}
      onClick={async () => {
        if (loading) return;
        if (campaignId) {
          setCampaignId('');
          return;
        }

        const projectBalance = balanceData?.balance != null ? Number(balanceData.balance) : null;
        const hasNoCredits = projectBalance !== null && projectBalance <= 0;
        if (hasNoCredits && !isVirtualLabAdmin) {
          await showInsufficientCreditsError();
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

          if (coordinateCountRes.status !== 200) {
            const message = await coordinateCountRes.json();
            const detailStr = typeof message?.detail === 'string' ? message.detail : '';
            const isLowFunds =
              message?.error_code === LOW_FUNDS_ERROR_CODE ||
              detailStr.toLowerCase().includes('insufficient') ||
              detailStr.toLowerCase().includes('credits');
            if (isLowFunds && !isVirtualLabAdmin) {
              await showInsufficientCreditsError();
            } else {
              notification.error({
                message: get(messages, `${activity}.CoordinateCountFailed`),
                description: detailStr || (message?.detail ?? 'Unknown error'),
              });
            }
            return;
          }

          const res = await authFetch(apiUrl, {
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
            let shouldShowCreditsMessage = isLowFundsFromApi && !isVirtualLabAdmin;
            if (!isVirtualLabAdmin && !shouldShowCreditsMessage) {
              const balance =
                balanceData?.balance != null
                  ? Number(balanceData.balance)
                  : await getProjectAccountBalance({ virtualLabId, projectId })
                      .then((b) => (b?.balance != null ? Number(b.balance) : null))
                      .catch(() => null);
              // Show credits message when: balance is 0, or we couldn't fetch it (assume credits issue)
              shouldShowCreditsMessage = balance === null ? true : balance <= 0;
            }

            if (shouldShowCreditsMessage) {
              await showInsufficientCreditsError();
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

          setCampaignId(returnedCampaignId);
          onTabChange();
        } catch (e) {
          notification.error({ message: assertErrorMessage(e) });
          return;
        } finally {
          setLoading(false);
        }
      }}
      disabled={!!(errors && errors.length > 0) || loading}
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
