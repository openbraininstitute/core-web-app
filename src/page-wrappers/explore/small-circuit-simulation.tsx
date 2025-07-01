import SmallCircuitSimulation from '@/features/small-microcircuit';

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
    <SmallCircuitSimulation
      virtualLabId={params.virtualLabId}
      projectId={params.projectId}
      circuitId={payload.simulation.entity_id}
      initialCampaignId={payload.campaign.id}
      initialConfig={payload.config.form}
    />
  );
}
