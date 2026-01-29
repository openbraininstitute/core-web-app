import { lowerCase, upperFirst } from 'es-toolkit/compat';

import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/circuit-simulation-campaign';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';
import { getSimulationStatus } from '@/entity-configuration/domain/simulation';
import { ExecutionStatus } from '@/ui/segments/activity-execution/status';
import { BaseTable } from '@/ui/segments/data-table/table';
import { cn } from '@/utils/css-class';

function getParamLabel(param: string) {
  return upperFirst(lowerCase(param.split('.').at(-1))); // e.g. "initialize.random_seed" -> "Random seed"
}

const className = 'text-primary-7';

export const viewConfig: ListExpandedViewConfig<ICircuitSimulationCampaign> = {
  expandIconColumnIndex: 7,
  render: (simulationCampaign) => {
    const simulations = simulationCampaign.simulations ?? [];

    const allScanParamSet = simulations.reduce(
      (set, simulation) => set.union(new Set(Object.keys(simulation.scan_parameters))),
      new Set<string>()
    );

    const columns = [
      {
        title: 'Name',
        className: cn(className, 'whitespace-nowrap'),
        dataIndex: 'name',
        key: 'name',
        width: 120,
        fixed: 'left' as const,
      },

      ...Array.from(allScanParamSet).map((param) => ({
        title: <span title={param}>{getParamLabel(param)}</span>,
        className,
        dataIndex: ['scan_parameters', param],
        key: param,
      })),

      {
        title: 'Status',
        render: (simulation: ICircuitSimulation) => (
          <ExecutionStatus status={getSimulationStatus(simulation)} />
        ),
        width: 120,
        className,
        key: 'status',
        fixed: 'right' as const,
      },
    ];

    return (
      <div className="pr-36 pl-12">
        <BaseTable
          dataSource={simulations}
          columns={columns}
          dataType={ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation}
          scrollable={false}
          className="[&_.ant-table]:bg-background! [&_.ant-table-tbody>tr>td]:bg-background! [&_.ant-table-thead>tr>th]:bg-background!"
        />
      </div>
    );
  },
  isExpandable: () => true,
};
