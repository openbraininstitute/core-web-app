import { ConfigProvider, Table } from 'antd';

import { getSimulationStatus } from '@/entity-configuration/domain/simulation';
import { ExecutionStatus } from '@/features/task/activity-execution/status';
import { getParamTitle, TaskViewConfig } from '@/features/task/expanded-view';

import type { ColumnsType } from 'antd/es/table';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ICircuitSimulationCampaign } from '@/api/entitycore/types/entities/simulation-campaign';
import type { TActivityStatus } from '@/api/entitycore/types/shared/activity';
import type { ListExpandedViewConfig } from '@/entity-configuration/definitions/list-expanded-view-defs/types';

const className = 'text-primary-9! whitespace-nowrap';
type SimulationRow = ISimulation & { status?: TActivityStatus };

export const viewConfig: ListExpandedViewConfig<ICircuitSimulationCampaign> = {
  expandIconColumnIndex: 6,
  expandIcon:
    TaskViewConfig.expandIcon as ListExpandedViewConfig<ICircuitSimulationCampaign>['expandIcon'],
  render: (simulationCampaign, records) => {
    const simulations =
      records.length > 0
        ? (records as unknown as SimulationRow[])
        : ((simulationCampaign.simulations ?? []) as SimulationRow[]);

    const allScanParamSet = simulations.reduce(
      (set, simulation) => set.union(new Set(Object.keys(simulation.scan_parameters))),
      new Set<string>()
    );

    const columns: ColumnsType<SimulationRow> = [
      {
        title: <span className={className}>Name</span>,
        className,
        dataIndex: 'name',
        key: 'name',
        ellipsis: true,
        fixed: 'left' as const,
      },

      ...Array.from(allScanParamSet).map((param) => ({
        title: <span title={param}>{getParamTitle(param)}</span>,
        className,
        dataIndex: ['scan_parameters', param],
        ellipsis: true,
        key: param,
      })),

      {
        title: <span className={className}>Status</span>,
        render: (_: unknown, simulation: SimulationRow) => (
          <div className="flex items-center justify-center">
            <ExecutionStatus status={simulation.status ?? getSimulationStatus(simulation)} />
          </div>
        ),
        width: 200,
        align: 'center',
        className,
        key: 'status',
        fixed: 'right' as const,
      },
    ];

    return (
      <div className="pr-36 pl-12">
        <ConfigProvider theme={{ hashed: false }}>
          <Table
            size="middle"
            bordered
            columns={columns}
            dataSource={simulations}
            rowKey="id"
            pagination={false}
            className="[&_.ant-table-cell]:bg-background! [&_.ant-table-thead>th]:text-primary-9! [&_.ant-table-row:hover>td]:bg-gray-100!"
          />
        </ConfigProvider>
      </div>
    );
  },
  isExpandable: () => true,
};
