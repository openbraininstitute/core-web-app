'use client';

import { ArrowRightOutlined, LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { usePathname } from 'next/navigation';
import { saveAs } from 'file-saver';

import ModelDetails from '@/features/entities/neuron-simulation/elements/me-model-details';
import ExperimentSetup from '@/components/simulate/SimulationDetails/ExperimentSetup';
import Nav from '@/components/build-section/virtual-lab/me-model/Nav';
import Overview from '@/features/details-view/overview';
import Link from '@/components/Link';

import { getViewDefinitionByLegacyType } from '@/entity-configuration/definitions/view-defs';
import { DataType } from '@/constants/explore-section/list-views';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { useSimulation } from '@/hooks/useSimulation';

import type { IMEModel, ISingleNeuronSimulation } from '@/api/entitycore/types';
import type { SimulationType } from '@/types/simulation/common';

type Props = {
  payload: {
    source: ISingleNeuronSimulation;
    memodel: IMEModel;
    config: any;
  };
  params: {
    id: string;
    projectId: string;
    virtualLabId: string;
  };
  simulationType: SimulationType;
};

export default function SimulationDetailPage({ params, simulationType, payload }: Props) {
  const id = usePathname().split('/').pop() as string;

  const { simulation, meModel, simulationConfig } = useSimulation({
    id,
    virtualLabId: params.virtualLabId,
    projectId: params.projectId,
    type: simulationType,
  });

  const vlProjectUrl = generateVlProjectUrl(params.virtualLabId, params.projectId);
  const prevPath = `${vlProjectUrl}/simulate`;

  const fields = getViewDefinitionByLegacyType(DataType.SingleNeuronSimulation)?.summaryViewFields;

  if (!simulation || !meModel || !simulationConfig) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading simulation ...</h2>
      </div>
    );
  }

  if (!fields)
    throw new Error(`Cannot find fields definition for ${DataType.SingleNeuronSimulation}`);

  return (
    <div className="text-primary-8 grid grid-cols-[min-content_auto] bg-white">
      <Nav
        params={params}
        extraLinks={[
          {
            key: LinkItemKey.Explore,
            href: `${vlProjectUrl}/explore/interactive`,
            content: 'Explore',
            styles: 'rounded-full bg-primary-5 py-3 text-primary-9 w-2/3',
          },
        ]}
      />
      <div className="flex h-screen w-full">
        <Link
          className="bg-neutral-1 text-primary-8 flex h-full w-[40px] flex-col items-center pt-2 text-sm"
          href={prevPath}
        >
          <ArrowRightOutlined className="mt-1.5 mb-4 rotate-180" />
          <div style={{ writingMode: 'vertical-rl', rotate: '180deg' }}>Back to list</div>
        </Link>
        <div className="secondary-scrollbar flex h-full w-full flex-col gap-7 overflow-y-scroll bg-white p-7 pr-12">
          <Overview
            fields={fields}
            detail={simulation}
            commonFields={[]}
            fieldsClassName="grid w-full auto-rows-min grid-cols-3 gap-x-8 gap-y-6"
            onDownload={() => {
              const jsonString = JSON.stringify(simulationConfig);
              const blob = new Blob([jsonString], { type: 'application/json' });
              saveAs(blob, `simulation-${simulation.id}.json`);
            }}
          />
          <ModelDetails
            meModel={payload.memodel}
            virtualLabId={params.virtualLabId}
            projectId={params.projectId}
          />
          <ExperimentSetup
            experimentSetup={simulationConfig}
            type="single-neuron-simulation"
            meModel={payload.memodel}
          />
        </div>
      </div>
    </div>
  );
}
