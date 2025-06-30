'use client';

import { ArrowRightOutlined } from '@ant-design/icons';
import { saveAs } from 'file-saver';

import ModelDetails from '@/features/entities/neuron-simulation/elements/me-model-details';
import ExperimentSetup from '@/components/simulate/SimulationDetails/experiment-setup';
import Nav from '@/components/build-section/virtual-lab/me-model/Nav';
import Overview from '@/features/details-view/overview';
import Link from '@/components/Link';

import { getViewDefinitionByLegacyType } from '@/entity-configuration/definitions/view-defs';
import { resolveExperimentUrl, resolveProjectUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';
import { useSimulationConfig } from '@/hooks/useSimulation';

import type { IMEModel, ISingleNeuronSimulation } from '@/api/entitycore/types';

type Props = {
  payload: {
    source: ISingleNeuronSimulation;
    memodel: IMEModel;
  };
  params: {
    id: string;
    projectId: string;
    virtualLabId: string;
  };
};

export default function SimulationDetailPage({ params, payload }: Props) {
  const { simulationConfig, error, loading } = useSimulationConfig({
    source: payload.source,
  });

  const fields = getViewDefinitionByLegacyType(DataType.SingleNeuronSimulation)?.summaryViewFields;

  if (!fields)
    throw new Error(`Cannot find fields definition for ${DataType.SingleNeuronSimulation}`);

  return (
    <div className="text-primary-8 grid grid-cols-[min-content_auto] bg-white">
      <Nav
        params={params}
        extraLinks={[
          {
            key: LinkItemKey.Explore,
            href: `${resolveProjectUrl({ ...params })}/explore/interactive`,
            content: 'Explore',
            styles: 'rounded-full bg-primary-5 py-3 text-primary-9 w-2/3',
          },
        ]}
      />
      <div className="flex h-screen w-full">
        <Link
          className="bg-neutral-1 text-primary-8 flex h-full w-[40px] flex-col items-center pt-2 text-sm"
          href={`${resolveExperimentUrl({
            ctx: { ...params },
            dataType: 'single_neuron_simulation',
          })}?s=browse&t=single-neuron`}
        >
          <ArrowRightOutlined className="mt-1.5 mb-4 rotate-180" />
          <div style={{ writingMode: 'vertical-rl', rotate: '180deg' }}>Back to list</div>
        </Link>
        <div className="secondary-scrollbar flex h-full w-full flex-col gap-7 overflow-y-scroll bg-white p-7 pr-12">
          <Overview
            fields={fields}
            detail={payload.source}
            commonFields={[]}
            fieldsClassName="grid w-full auto-rows-min grid-cols-3 gap-x-8 gap-y-6"
            onDownload={() => {
              if (!error && simulationConfig) {
                const jsonString = JSON.stringify(simulationConfig);
                const blob = new Blob([jsonString], { type: 'application/json' });
                saveAs(blob, `simulation-${payload.source.id}.json`);
              }
            }}
          />
          <ModelDetails
            meModel={payload.memodel}
            virtualLabId={params.virtualLabId}
            projectId={params.projectId}
          />
          <ExperimentSetup
            loading={loading}
            error={error}
            experimentSetup={simulationConfig}
            type="single-neuron-simulation"
            meModel={payload.memodel}
          />
        </div>
      </div>
    </div>
  );
}
