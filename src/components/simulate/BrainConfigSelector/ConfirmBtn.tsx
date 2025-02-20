import { useEffect, useState } from 'react';
import { loadable } from 'jotai/utils';
import { useAtomValue } from 'jotai';
import { notification } from 'antd';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import circuitAtom from '@/state/circuit';
import { classNames } from '@/util/utils';
import { createSimulationCampaignUIConfig } from '@/services/bbp-workflow/simulationHelper';
import expDesParamsDefaults from '@/components/experiment-designer/experiment-designer-defaults';
import GenericButton from '@/components/Global/GenericButton';

const expDesBaseUrl = '/app/experiment-designer/experiment-setup';

const loadableCircuitAtom = loadable(circuitAtom);

type Props = {
  brainModelConfigId: string | null;
  campaignName: string;
  campaignDescription: string;
};

export default function ConfirmBtn({
  brainModelConfigId,
  campaignName,
  campaignDescription,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const circuitInfoLodable = useAtomValue(loadableCircuitAtom);
  const router = useRouter();
  const { data: session } = useSession();

  const circuitInfo = circuitInfoLodable.state === 'hasData' ? circuitInfoLodable.data : null;

  useEffect(() => {
    if (!brainModelConfigId || circuitInfoLodable.state !== 'hasData') return;
    if (!campaignName || !campaignDescription) {
      setAllowed(false);
      return;
    }

    if (!circuitInfo) {
      notification.error({
        message: 'Circuit was not built',
      });
      setAllowed(false);
      return;
    }

    setAllowed(true);
  }, [
    circuitInfo,
    brainModelConfigId,
    circuitInfoLodable.state,
    campaignName,
    campaignDescription,
  ]);

  const createSimCamUiConfig = async () => {
    if (!circuitInfo || !session || !brainModelConfigId) return;

    setProcessing(true);
    setAllowed(false);
    const simCampUiConfigResource = await createSimulationCampaignUIConfig(
      campaignName,
      campaignDescription,
      circuitInfo,
      structuredClone(expDesParamsDefaults),
      session
    ).catch((e) => {
      const msg = `Error creating simulation entity: ${e.message}`;
      notification.error({
        message: msg,
      });
      throw new Error(msg);
    });
    const simUICfgPart = `simulationCampaignUIConfigId=${simCampUiConfigResource['@id']
      .split('/')
      .pop()}`;
    router.push(`${expDesBaseUrl}?${simUICfgPart}`);
    setProcessing(false);
    setAllowed(true);
  };

  return (
    <GenericButton
      onClick={createSimCamUiConfig}
      className={classNames(
        allowed ? 'bg-secondary-2 ' : 'cursor-not-allowed bg-slate-400',
        'fixed bottom-4 right-4 flex items-center text-white'
      )}
      text={processing ? 'Processing' : 'Confirm'}
    />
  );
}
