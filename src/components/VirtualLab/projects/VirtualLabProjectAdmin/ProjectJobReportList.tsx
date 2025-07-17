import { ConfigProvider, Table } from 'antd';
import { useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { useCallback, useState } from 'react';
import { useLoadable, useUnwrappedValue } from '@/hooks/hooks';
import {
  projectJobReportsAtomFamily,
  virtualLabProjectUsersAtomFamily,
} from '@/state/virtual-lab/projects';
import { JobReport, ServiceSubtype } from '@/types/accounting';

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
    (userId: string) => projectUsers?.data?.users?.find((user) => user.id === userId),
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
        className="mt-6 mb-12"
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
