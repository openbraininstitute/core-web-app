import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Table } from 'antd';
import find from 'es-toolkit/compat/find';

import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardContent } from '@/ui/molecules/card';
import { ServiceSubtype } from '@/types/accounting';
import { renderDateAndHour } from '@/util/date';
import { cn } from '@/utils/css-class';

import type { JobReport } from '@/types/accounting';

const { Column } = Table;

const activityLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
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
};

function activityRenderFn(subtype: ServiceSubtype) {
  return activityLabel[subtype] ?? subtype;
}

const scaleLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.Notebook]: 'Notebook',
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
};

function scaleRenderFn(subtype: ServiceSubtype) {
  return scaleLabel[subtype] ?? subtype;
}

function costRenderFn(amount: string) {
  return <span>{amount}</span>;
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
      <Card shadowless className={cn('w-full', { 'pb-0': !!total })}>
        <CardContent>
          <Table<JobReport>
            sticky
            size="middle"
            className={cn(
              '[&.ant-table]:bg-neutral-1! w-full!',
              '[&_.ant-table-thead_th]:text-neutral-4! [&_.ant-table-thead_th]:font-light!',
              '[&_.ant-table-thead_th]:bg-neutral-1! [&_.ant-table-tbody]:bg-neutral-1!',
              '[&_.ant-table-tbody_td]:text-primary-9 [&_.ant-pagination]:gap-2',
              '[&:has(.ant-table-empty)_td:last]:border-b-none! [&:has(.ant-table-empty)_tr]:bg-neutral-1! [&:has(.ant-table-empty)_tr]:hover:bg-neutral-1!',
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
        </CardContent>
      </Card>
    </div>
  );
}

export default JobReportList;
