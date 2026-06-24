import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Table } from 'antd';
import find from 'es-toolkit/compat/find';
import { useCallback, useState } from 'react';

import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { ServiceSubtype } from '@/types/accounting';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardContent } from '@/ui/molecules/card';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { JobReport } from '@/types/accounting';

const { Column } = Table;

const categoryLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
  [ServiceSubtype.NeuronMeshSkeletonization]: 'Process data',
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
  [ServiceSubtype.EM_SYNAPSE_MAPPING]: 'Build',
};

export function categoryRenderFn(subtype: ServiceSubtype) {
  return categoryLabel[subtype] ?? subtype;
}

const typeLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
  [ServiceSubtype.NeuronMeshSkeletonization]: 'EM mesh skeletonization',
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
  [ServiceSubtype.EM_SYNAPSE_MAPPING]: 'Electron microscopy circuit',
};

export function typeRenderFn(subtype: ServiceSubtype) {
  return typeLabel[subtype] ?? subtype;
}

function costRenderFn(amount: string) {
  const numericAmount = parseFloat(amount);
  const formattedAmount = Number.isNaN(numericAmount) ? amount : numericAmount.toFixed(2);
  return <span>{formattedAmount}</span>;
}

export function JobReportList() {
  const { virtualLabId, projectId } = useWorkspace();
  const [pagination, setPagination] = useState({ page: 1, pageSize: 8 });

  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  const {
    data,
    isPending: isLoadingJobReports,
    isFetching: isFetchingJobReports,
  } = useQuery({
    queryKey: keyBuilder.credits({ virtualLabId, projectId, ...pagination }),
    queryFn: () =>
      getProjectJobReports({
        virtualLabId,
        projectId,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }),
    placeholderData: keepPreviousData,
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
      <Card shadowless className={cn('w-full', { 'pb-0': !!total })}>
        <CardContent>
          <Table<JobReport>
            sticky
            size="middle"
            className={cn(
              '[&_.ant-pagination-item]:rounded-full! [&_.ant-pagination-item-link]:rounded-full!',
              '[&.ant-table]:bg-neutral-1! w-full!',
              '[&_.ant-table-thead_th]:text-neutral-4! [&_.ant-table-thead_th]:font-light!',
              '[&_.ant-table-thead_th]:bg-neutral-1! [&_.ant-table-tbody]:bg-neutral-1!',
              '[&_.ant-table-tbody_td]:text-primary-9 [&_.ant-pagination]:gap-2',
              '[&:has(.ant-table-empty)_td:last]:border-b-none! [&:has(.ant-table-empty)_tr]:bg-neutral-1! [&:has(.ant-table-empty)_tr]:hover:bg-neutral-1!',
              '[&_th]:uppercase!'
            )}
            loading={isLoadingJobReports || isLoadingUsers || isFetchingJobReports}
            dataSource={jobReports}
            pagination={{
              pageSize: pagination.pageSize,
              total,
              onChange: (page, pageSize) => setPagination((prev) => ({ ...prev, page, pageSize })),
              hideOnSinglePage: true,
            }}
            rowKey="job_id"
          >
            <Column title="Category" dataIndex="subtype" key="category" render={categoryRenderFn} />
            <Column title="Type" dataIndex="subtype" key="type" render={typeRenderFn} />
            <Column title="Member" dataIndex="user_id" key="user" render={userRenderFn} />
            <Column title="Date" dataIndex="started_at" key="date" render={renderDateAndHour} />
            <Column title="Cost (Credits)" dataIndex="amount" key="cost" render={costRenderFn} />
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default JobReportList;
