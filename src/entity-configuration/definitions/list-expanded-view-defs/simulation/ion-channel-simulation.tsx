import { getSimulationStatus } from '@/entity-configuration/domain/simulation';
import { ActivityStatusRenderer } from '@/features/task-runner/activity-execution/status';
import {
  createNameColumn,
  createScanParameterColumns,
  createStatusColumn,
  renderExpandedTable,
  TaskViewConfig,
} from '@/features/task-runner/expanded-view';

import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/simulation-campaign';
import type { TActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';

type TSimulationRow = ISimulation & { status?: TActivityStatus };

export const viewConfig: ListExpandedViewConfig<ICircuitSimulationCampaign> = {
  expandIconColumnIndex: 5,
  expandIcon:
    TaskViewConfig.expandIcon as ListExpandedViewConfig<ICircuitSimulationCampaign>['expandIcon'],
  render: (simulationCampaign, records) => {
    const simulations =
      records.length > 0
        ? (records as unknown as TSimulationRow[])
        : ((simulationCampaign.simulations ?? []) as TSimulationRow[]);

    const allScanParamSet = simulations.reduce(
      (set, simulation) => set.union(new Set(Object.keys(simulation.scan_parameters))),
      new Set<string>()
    );

    const columns = [
      createNameColumn<TSimulationRow>(),
      ...createScanParameterColumns<TSimulationRow>(allScanParamSet),
      createStatusColumn<TSimulationRow>((_: unknown, simulation: TSimulationRow) => (
        <div className="flex items-center justify-center">
          <ActivityStatusRenderer status={simulation.status ?? getSimulationStatus(simulation)} />
        </div>
      )),
    ];

    return renderExpandedTable<TSimulationRow>({ columns, dataSource: simulations });
  },
  isExpandable: () => true,
};
