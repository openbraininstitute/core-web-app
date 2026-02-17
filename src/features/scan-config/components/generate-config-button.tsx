import { LoadingOutlined } from '@ant-design/icons';
import { get } from 'es-toolkit/compat';

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
import { messages } from '@/i18n/en/scan-config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { assertErrorMessage, classNames } from '@/util/utils';

import { useApiUrl } from './hooks';

import type { ErrorObject } from 'ajv';
import type { IMEModel } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { Config } from './components';

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
            notification.error({
              message: get(messages, `${activity}.CoordinateCountFailed`),
              description: message.detail,
            });
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

            const details =
              res.status === 500 ? errorRes.detail : (errorRes?.details?.[0].msg ?? '');

            notification.error({
              message: get(messages, `${activity}.ScanConfigGenerateGridFailed`),
              description: details,
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
