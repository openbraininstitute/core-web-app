'use client';

import { ArrowRightOutlined } from '@ant-design/icons';
import Link from 'next/link';

import Nav from '@/components/build-section/virtual-lab/me-model/Nav';
import SmallCircuitSimulation from '@/features/small-microcircuit';

import { resolveExperimentUrl, resolveProjectUrl } from '@/utils/url-builder';
import { LinkItemKey } from '@/constants/virtual-labs/sidemenu';

import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';

type Props = {
  payload: {
    campaign: ICircuitSimulationCampaign;
    simulation: ICircuitSimulation;
    config: Record<string, any>;
  };
  params: {
    id: string;
    projectId: string;
    virtualLabId: string;
  };
};

export default function Page({ params, payload }: Props) {
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
        <div className="secondary-scrollbar flex h-full w-full flex-col gap-7 overflow-y-scroll bg-gray-100 p-7 pr-12">
          <SmallCircuitSimulation
            virtualLabId={params.virtualLabId}
            projectId={params.projectId}
            circuitId={payload.simulation.entity_id}
            initialCampaignId={payload.campaign.id}
            initialConfig={payload.config.form}
          />
        </div>
      </div>
    </div>
  );
}
