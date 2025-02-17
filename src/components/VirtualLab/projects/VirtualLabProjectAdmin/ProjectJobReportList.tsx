import { ConfigProvider, Table } from 'antd';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { useCallback, useState } from 'react';
import { useLoadable, useUnwrappedValue } from '@/hooks/hooks';
import {
  projectJobReportsAtomFamily,
  virtualLabProjectUsersAtomFamily,
} from '@/state/virtual-lab/projects';
import { JobReport, ServiceSubtype } from '@/types/virtual-lab/accounting';

const { Column } = Table;

function useGetProjectUserById({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const projectUsers = useUnwrappedValue(
    virtualLabProjectUsersAtomFamily({ virtualLabId, projectId })
  );

  return useCallback(
    (userId: string) => projectUsers?.find((user) => user.id === userId),
    [projectUsers]
  );
}

function useJobReports({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) {
  const [page, setPage] = useState<number>(1);

  const jobReportsDataLoadableAtom = loadable(
    projectJobReportsAtomFamily({ virtualLabId, projectId, page })
  );
  const isLoading = useAtomValue(jobReportsDataLoadableAtom).state === 'loading';

  const jobReportsData = useLoadable(jobReportsDataLoadableAtom, null);

  return {
    jobReports: jobReportsData?.data.items ?? [],
    totalReports: jobReportsData?.data.meta.total_items,
    isLoading,
    page,
    setPage,
  };
}

const tableTheme = {
  components: {
    Table: {
      headerSplitColor: '#40a9ff',
      borderColor: '#40a9ff',
    },
  },
  token: {
    colorBgBase: '#002766',
    colorText: '#ffffff',
    colorTextBase: '#ffffff',
  },
};

const activityLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.SingleCellSim]: 'Simulate',
  [ServiceSubtype.SynaptomeSim]: 'Simulate',
  [ServiceSubtype.Storage]: 'Storage',
  // TODO: check if the following subtypes are still relevant and find better labels for them
  [ServiceSubtype.MlRetrieval]: 'ML',
  [ServiceSubtype.MlLlm]: 'ML',
  [ServiceSubtype.MlRag]: 'ML',
};

function activityRenderFn(subtype: ServiceSubtype) {
  return activityLabel[subtype] ?? subtype;
}

const scaleLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.SingleCellSim]: 'Single cell',
  [ServiceSubtype.SynaptomeSim]: 'Synaptome',
  [ServiceSubtype.Storage]: 'Storage',
  // TODO: check if the following subtypes are still relevant and find better labels for them
  [ServiceSubtype.MlRetrieval]: 'ML',
  [ServiceSubtype.MlLlm]: 'ML',
  [ServiceSubtype.MlRag]: 'ML',
};

function scaleRenderFn(subtype: ServiceSubtype) {
  return scaleLabel[subtype] ?? subtype;
}

function costRenderFn(amount: string) {
  return <span>{amount}</span>;
}

function dateRenderFn(date: string) {
  const dateObj = new Date(date);
  return (
    <div className="flex flex-col">
      <span>{dateObj.toLocaleDateString()}</span>
      <span className="text-gray-400">{dateObj.toLocaleTimeString()}</span>
    </div>
  );
}

export default function JobReportList({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const { jobReports, isLoading, setPage, totalReports } = useJobReports({
    virtualLabId,
    projectId,
  });

  const getProjectUserById = useGetProjectUserById({ virtualLabId, projectId });

  const userRenderFn = useCallback(
    (userId: string) => {
      const user = getProjectUserById(userId);

      if (!user) {
        return 'Unknown user';
      }

      return `${user.first_name} ${user.last_name}`;
    },
    [getProjectUserById]
  );

  return (
    <ConfigProvider theme={tableTheme}>
      <Table<JobReport>
        size="small"
        className="mb-12 mt-6"
        loading={isLoading}
        dataSource={jobReports}
        pagination={{
          pageSize: 10,
          total: totalReports,
          onChange: (page) => setPage(page),
          hideOnSinglePage: true,
        }}
        rowKey="job_id"
      >
        <Column title="Activity" dataIndex="subtype" key="activity" render={activityRenderFn} />
        <Column title="Scale" dataIndex="subtype" key="scale" render={scaleRenderFn} />
        <Column title="User" dataIndex="user_id" key="user" render={userRenderFn} />
        <Column title="Date" dataIndex="started_at" key="date" render={dateRenderFn} />
        <Column title="Credits" dataIndex="amount" key="cost" render={costRenderFn} />
      </Table>
    </ConfigProvider>
  );
}
