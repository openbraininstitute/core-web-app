import { lowerCase, upperFirst } from 'es-toolkit/compat';

import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { BaseTable } from '@/ui/segments/data-table/table';
import { formatNumber } from '@/util/common';
import type { ListExpandedViewConfig } from '../types';

function getParamLabel(param: string) {
  return upperFirst(lowerCase(param.split('.').at(-1))) // e.g. "initialize.random_seed" -> "Random seed"
}

export const viewConfig: ListExpandedViewConfig<ICircuitSimulationCampaign> = {
  render: (simulationCampaign) => {

    const simulations = simulationCampaign.simulations ?? [];

    const allScanParamSet = simulations.reduce((set, simulation) => set.union(new Set(Object.keys(simulation.scan_parameters))), new Set<string>());

    const columns = [
      { title: 'Name', dataIndex: 'name', key: 'name', fixed: 'left' as const },
      ...Array.from(allScanParamSet).map((param) => ({
        title: <span title={param}>{getParamLabel(param)}</span>,
        dataIndex: ['scan_parameters', param],
        key: param,
      })),
      { title: 'Status', dataIndex: ['execution', 'status'], key: 'status', fixed: 'right' as const },
    ];

    return (
      <div className="pl-28">
        <BaseTable
          dataSource={simulations}
          columns={columns}
          dataType={ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation}
          scrollable={false}
        />
      </div>
    );
  },
  isExpandable: () => true,
};
