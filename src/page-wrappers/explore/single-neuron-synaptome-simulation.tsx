'use client';

import { ArrowRightOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { saveAs } from 'file-saver';

import ModelDetails from '@/features/entities/neuron-simulation/elements/synaptome-details';
import ExperimentSetup from '@/components/simulate/SimulationDetails/ExperimentSetup';
import Nav from '@/components/build-section/virtual-lab/me-model/Nav';
import Overview from '@/features/details-view/overview';
import Link from '@/components/Link';

import { resolveSingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
import { getViewDefinitionByLegacyType } from '@/entity-configuration/definitions/view-defs';
import { resolveExperimentUrl, resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';

import type { WorkspaceContext } from '@/types/common';

type Props = {
  payload: Awaited<ReturnType<typeof resolveSingleNeuronSynaptomeSimulation>>;
};

export default function SimulationDetailPage({ payload }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();

  const fields = getViewDefinitionByLegacyType(
    DataType.SingleNeuronSynaptomeSimulation
  )?.summaryViewFields;

  if (!fields)
    throw new Error(
      `Cannot find fields definition for ${DataType.SingleNeuronSynaptomeSimulation}`
    );

  return (
    <div className="text-primary-8 grid grid-cols-[min-content_auto] bg-white">
      <Nav
        params={{ virtualLabId, projectId }}
        extraLinks={[
          {
            key: LinkItemKey.Explore,
            href: resolveExploreDetailsPageUrl({ ctx: { virtualLabId, projectId } }),
            content: 'Explore',
            styles: 'rounded-full bg-primary-5 py-3 text-primary-9 w-2/3',
          },
        ]}
      />
      <div className="flex h-screen w-full">
        <Link
          className="bg-neutral-1 text-primary-8 flex h-full w-[40px] flex-col items-center pt-2 text-sm"
          href={`${resolveExperimentUrl({
            ctx: { virtualLabId, projectId },
            dataType: 'single_neuron_synaptome_simulation',
          })}?s=new&t=synaptome`}
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
              const jsonString = JSON.stringify(payload.config);
              const blob = new Blob([jsonString], { type: 'application/json' });
              saveAs(blob, `synaptome-simulation-${payload.source.id}.json`);
            }}
          />
          <ModelDetails
            meModel={payload.memodel}
            synaptome={payload.synaptome}
            virtualLabId={virtualLabId}
            projectId={projectId}
          />
          <ExperimentSetup
            experimentSetup={payload.config}
            type="synaptome-simulation"
            meModel={payload.memodel}
          />
        </div>
      </div>
    </div>
  );
}
