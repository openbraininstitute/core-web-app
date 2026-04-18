import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { Table } from 'antd';
import find from 'es-toolkit/compat/find';
import { useCallback, useState } from 'react';

import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { ServiceSubtype } from '@/types/accounting';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { JobReport } from '@/types/accounting';

const { Column } = Table;

const activityLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
  [ServiceSubtype.NeuronMeshSkeletonization]: 'Build',
  [ServiceSubtype.IonChannelBuild]: 'Build',
  [ServiceSubtype.IonChannelSim]: 'Simulate',
  [ServiceSubtype.SingleCellBuild]: 'Build',
  [ServiceSubtype.SingleCellSim]: 'Simulate',
  [ServiceSubtype.SmallCircuitSim]: 'Simulate',
  [ServiceSubtype.Storage]: 'Storage',
  [ServiceSubtype.SynaptomeBuild]: 'Build',
  [ServiceSubtype.SynaptomeSim]: 'Simulate',
  // TODO: check if the following subtypes are still relevant and find better labels for them
  [ServiceSubtype.MlRetrieval]: 'ML',
  [ServiceSubtype.MlLlm]: 'ML',
  [ServiceSubtype.MlRag]: 'ML',

  [ServiceSubtype.SingleCellSimulation]: 'Simulate',
  [ServiceSubtype.PairCellSimulation]: 'Simulate',
  [ServiceSubtype.SmallMicrocircuitSimulation]: 'Simulate',
  [ServiceSubtype.MicrocircuitSimulation]: 'Simulate',
  [ServiceSubtype.RegionSimulation]: 'Simulate',
  [ServiceSubtype.SystemSimulation]: 'Simulate',
  [ServiceSubtype.WholeBrainSimulation]: 'Simulate',
};

function activityRenderFn(subtype: ServiceSubtype) {
  return activityLabel[subtype] ?? subtype;
}

const scaleLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
  [ServiceSubtype.NeuronMeshSkeletonization]: 'Neuron morphology',
  [ServiceSubtype.IonChannelBuild]: 'Ion channel',
  [ServiceSubtype.IonChannelSim]: 'Ion channel',
  [ServiceSubtype.SingleCellBuild]: 'Single cell',
  [ServiceSubtype.SingleCellSim]: 'Single cell',
  [ServiceSubtype.SmallCircuitSim]: 'Small circuit',
  [ServiceSubtype.Storage]: 'Storage',
  [ServiceSubtype.SynaptomeBuild]: 'Synaptome',
  [ServiceSubtype.SynaptomeSim]: 'Synaptome',
  // TODO: check if the following subtypes are still relevant and find better labels for them
  [ServiceSubtype.MlRetrieval]: 'ML',
  [ServiceSubtype.MlLlm]: 'AI Assistant',
  [ServiceSubtype.MlRag]: 'ML',

  [ServiceSubtype.SingleCellSimulation]: 'Single: Single neuron + extrinsic connectivity',
  [ServiceSubtype.PairCellSimulation]:
    'Pair: Two connected neurons + intrinsic connectivity + extrinsic connectivity',
  [ServiceSubtype.SmallMicrocircuitSimulation]:
    'Small: Microcircuit (3-20 neurons) + intrinsic connectivity + extrinsic connectivity',
  [ServiceSubtype.MicrocircuitSimulation]:
    'Microcircuit: Any circuit larger than 20 neurons but not being a region, system, or whole-brain circuit',
  [ServiceSubtype.RegionSimulation]:
    'Region: Atlas-based continuous volume of an entire brain region or a set of continuous sub-regions',
  [ServiceSubtype.SystemSimulation]:
    'System: Non-continuous circuit consisting of at least two microcircuits/regions that are connected by inter-region connectivity',
  [ServiceSubtype.WholeBrainSimulation]: 'Circuit representing an entire brain',
};

function scaleRenderFn(subtype: ServiceSubtype) {
  return scaleLabel[subtype] ?? subtype;
}

function costRenderFn(amount: string) {
  const numericAmount = parseFloat(amount);
  const formattedAmount = Number.isNaN(numericAmount) ? amount : numericAmount.toFixed(2);
  return <span>{formattedAmount}</span>;
}

export function JobReportList() {
  const { virtualLabId, projectId } = useWorkspace();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 8 });

  const { data: users, isLoading } = useQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  const { data } = useSuspenseQuery({
    queryKey: keyBuilder.credits({ virtualLabId, projectId, ...pagination }),
    queryFn: () =>
      getProjectJobReports({
        virtualLabId,
        projectId,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }),
  });

  const jobReports = data?.data.items;
  const total = data?.data.meta.total_items;

  const userRenderFn = useCallback(
    (userId: string) => {
      const user = find(users?.data?.users, { id: userId });
      return user ? `${user.first_name} ${user.last_name}` : 'Unknown user';
    },
    [users]
  );

  return (
    <div className="mb-4 flex w-full flex-col items-start gap-2">
      <h3 className="text-primary-9 text-xl font-bold">History</h3>
      <Table<JobReport>
        sticky
        size="middle"
        className={cn(
          '[&.ant-table]:bg-primary-8! w-full!',
          '[&_.ant-table-thead_th]:text-white/70! [&_.ant-table-thead_th]:font-light!',
          '[&_.ant-table-thead_th]:bg-primary-8! [&_.ant-table-tbody]:bg-primary-8!',
          '[&_.ant-table-tbody_td]:text-white! [&_.ant-table-tbody_td]:border-white/10!',
          '[&_.ant-table-cell-row-hover]:bg-primary-7!',
          '[&_.ant-pagination]:gap-2',
          '[&:has(.ant-table-empty)_td:last]:border-b-none! [&:has(.ant-table-empty)_tr]:bg-primary-8! [&:has(.ant-table-empty)_tr]:hover:bg-primary-8!',
          '[&_th]:uppercase!'
        )}
        loading={isLoading}
        dataSource={jobReports}
        pagination={{
          pageSize: pagination.pageSize,
          total,
          onChange: (page, pageSize) => setPagination((prev) => ({ ...prev, page, pageSize })),
          hideOnSinglePage: true,
        }}
        rowKey="job_id"
      >
        <Column title="Activity" dataIndex="subtype" key="activity" render={activityRenderFn} />
        <Column title="Scale" dataIndex="subtype" key="scale" render={scaleRenderFn} />
        <Column title="Member" dataIndex="user_id" key="user" render={userRenderFn} />
        <Column title="Date" dataIndex="started_at" key="date" render={renderDateAndHour} />
        <Column title="Cost (Credits)" dataIndex="amount" key="cost" render={costRenderFn} />
      </Table>
    </div>
  );
}

export default JobReportList;
