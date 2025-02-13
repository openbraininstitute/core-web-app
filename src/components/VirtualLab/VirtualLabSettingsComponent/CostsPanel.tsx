import { useCallback, useMemo, useRef, useState } from 'react';
import { Table, ConfigProvider, Divider, Modal, Button, InputNumber } from 'antd';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { ErrorBoundary } from '@sentry/nextjs';

import { CloseOutlined, SwapOutlined } from '@ant-design/icons';
import { atomWithRefresh, loadable } from 'jotai/utils';
import { JobReport, ProjectBalance, ServiceSubtype } from '@/types/virtual-lab/accounting';
import {
  virtualLabProjectsAtomFamily,
  virtualLabProjectUsersAtomFamily,
} from '@/state/virtual-lab/projects';
import { useLastTruthyValue, useLoadable, useUnwrappedValue } from '@/hooks/hooks';
import { Project } from '@/types/virtual-lab/projects';
import {
  assignProjectBudget,
  getProjectJobReports,
  reverseProjectBudget,
} from '@/services/virtual-lab/projects';
import { getVirtualLabAccountBalance, topUpVirtualLabAccount } from '@/services/virtual-lab/labs';
import SimpleErrorComponent from '@/components/GenericErrorFallback';
import EditIcon from '@/components/icons/Edit';
import { virtualLabDetailAtomFamily } from '@/state/virtual-lab/lab';

const { Column } = Table;

function VirtualLabBlock({
  virtualLabId,
  balance,
  onBalanceChange,
}: {
  virtualLabId: string;
  balance: string;
  onBalanceChange: () => Promise<void>;
}) {
  const { createModal, contextHolder } = useVirtualLabTopUpModal();

  const openTopUpModal = () => {
    createModal({ virtualLabId, onSuccess: onBalanceChange });
  };

  return (
    <div className="flex w-full justify-between border-2 border-primary-3 p-6 text-white">
      <h2 className="text-2xl font-bold">Virtual Lab</h2>

      <div className="flex items-stretch border border-primary-3">
        <div className="flex flex-col justify-center border-r border-primary-3 px-4 py-2 text-right">
          <p className="text-sm text-primary-2">Credit balance</p>
          <p className="text-lg font-semibold">{balance}</p>
        </div>

        <button
          type="button"
          className="px-4 py-2 hover:bg-primary-5 focus:outline-none"
          aria-label="Top-up Virtual lab account"
          onClick={openTopUpModal}
        >
          <EditIcon />
        </button>
      </div>

      {contextHolder}
    </div>
  );
}

function ProjectCard({
  virtualLabId,
  project,
  balance,
  onBalanceChange,
}: {
  virtualLabId: string;
  project: Project;
  balance: ProjectBalance | undefined;
  onBalanceChange: () => Promise<void>;
}) {
  const {
    createModal: createBalanceTransferModal,
    contextHolder: balanceTransferModalContextHolder,
  } = useBalanceTransferModal();

  const onBalanceTransferClick = useCallback(() => {
    createBalanceTransferModal({
      virtualLabId,
      projectId: project.id,
      onTransferSuccess: onBalanceChange,
    });
  }, [createBalanceTransferModal, virtualLabId, project.id, onBalanceChange]);

  return (
    <div className="flex w-full items-center justify-between rounded-lg py-6 text-white">
      <div>
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 rounded-full bg-primary-3" />
          <span className="text-lg uppercase text-primary-2">Project</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold">{project.name}</h2>
      </div>
      <div className="flex items-stretch border border-primary-4">
        <div className="flex flex-col justify-center border-r border-primary-3 px-4 py-2 text-right">
          <p className="text-sm text-primary-2">Reserved</p>
          <p className="text-lg font-semibold">{balance?.reservation ?? ''}</p>
        </div>
        <div className="flex flex-col justify-center border-r border-primary-3 px-4 py-2 text-right">
          <p className="text-sm text-primary-2">Credit balance</p>
          <p className="text-lg font-semibold">{balance?.balance ?? ''}</p>
        </div>
        <button
          type="button"
          className="flex items-center justify-center px-4 py-2 hover:bg-primary-5 focus:outline-none"
          aria-label="Transfer credits"
          onClick={onBalanceTransferClick}
        >
          <EditIcon />
        </button>
      </div>

      {balanceTransferModalContextHolder}
    </div>
  );
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

function activityRenderFn(subtype: ServiceSubtype) {
  return subtype === 'single-cell-sim' ? 'Simulate' : subtype;
}

const scaleLabel: Record<ServiceSubtype, string> = {
  [ServiceSubtype.SingleCellSim]: 'Single cell',
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

function useJobReports({ virtualLabId, projectId }: { virtualLabId: string; projectId: string }) {
  const pageAtom = useMemo(() => atom<number>(1), []);

  const jobReportsDataLoadableAtom = useMemo(
    () =>
      loadable(
        atom(async (get) => {
          const page = get(pageAtom);

          const jobReportsResponse = await getProjectJobReports({
            virtualLabId,
            projectId,
            page,
            // TODO: add signal to cancel stale requests
          });

          return jobReportsResponse.data;
        })
      ),
    [virtualLabId, projectId, pageAtom]
  );

  const [page, setPage] = useAtom(pageAtom);
  const isLoading = useAtomValue(jobReportsDataLoadableAtom).state === 'loading';

  const jobReportsData = useLoadable(jobReportsDataLoadableAtom, null);

  return {
    jobReports: jobReportsData?.items ?? [],
    totalReports: jobReportsData?.meta.total_items,
    isLoading,
    page,
    setPage,
  };
}

export function useVirtualLabBalance({ virtualLabId }: { virtualLabId: string }) {
  const balanceAtom = useMemo(
    () =>
      atomWithRefresh(async () =>
        getVirtualLabAccountBalance({
          virtualLabId,
          includeProjects: true,
        })
      ),
    [virtualLabId]
  );

  return [useLastTruthyValue(balanceAtom), useSetAtom(balanceAtom)] as const;
}

type JobReportListProps = {
  virtualLabId: string;
  projectId: string;
};

function JobReportList({ virtualLabId, projectId }: JobReportListProps) {
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

function VirtualLabTopUpForm({
  virtualLabId,
  onClose,
  onSuccess,
}: {
  virtualLabId: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const topUp = async () => {
    if (!amount) {
      return;
    }

    setLoading(true);
    await topUpVirtualLabAccount({ virtualLabId, amount });
    await onSuccess();
    onClose();
  };

  return (
    <>
      <span className="text-2xl font-bold">Virtual Lab account top-up</span>
      <span className="text-warning">
        This is for demo purposes only. Will be replaced with payment provider integration
      </span>

      <div className="mt-8">
        <span className="text-xl font-bold">Amount, credits</span> <br />
        <InputNumber
          className="my-2 block w-full"
          placeholder="0"
          value={amount}
          min={0.01}
          max={1000}
          onChange={(value) => setAmount(value ?? 0)}
        />
      </div>

      <div className="mr-[-34px] mt-8 text-right">
        <Button
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-none border-none px-5 py-6 shadow-none"
        >
          Cancel
        </Button>
        <Button
          type="primary"
          className="ml-2 inline-flex items-center justify-center rounded-none bg-primary-8 px-8 py-6"
          disabled={!amount}
          onClick={topUp}
          loading={loading}
        >
          Top-up
        </Button>
      </div>
    </>
  );
}

enum TransferType {
  PROJECT_TO_VLAB = 'proj->vlab',
  VLAB_TO_PROJECT = 'vlab->proj',
}

function BalanceTransferForm({
  virtualLabId,
  projectId,
  onClose,
  onTransferSuccess,
}: {
  virtualLabId: string;
  projectId: string;
  onClose: () => void;
  onTransferSuccess: () => Promise<void>;
}) {
  const projectsObj = useUnwrappedValue(virtualLabProjectsAtomFamily(virtualLabId));
  const virtualLabDetails = useUnwrappedValue(virtualLabDetailAtomFamily(virtualLabId));
  const [virtualLabBalance] = useVirtualLabBalance({ virtualLabId });

  const [transferType, setTransferType] = useState<TransferType>(TransferType.VLAB_TO_PROJECT);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const toggleTransferType = () => {
    setTransferType((prev) =>
      prev === TransferType.PROJECT_TO_VLAB
        ? TransferType.VLAB_TO_PROJECT
        : TransferType.PROJECT_TO_VLAB
    );

    setAmount(undefined);
  };

  const transfer = async () => {
    if (!amount) {
      throw new Error('Amount is required');
    }

    setLoading(true);
    if (transferType === TransferType.VLAB_TO_PROJECT) {
      await assignProjectBudget({
        virtualLabId,
        projectId,
        amount,
      });
    } else {
      await reverseProjectBudget({
        virtualLabId,
        projectId,
        amount,
      });
    }
    await onTransferSuccess();
    onClose();
  };

  const project = projectsObj?.results?.find((proj) => proj.id === projectId);
  const projectBalance = virtualLabBalance?.data.projects?.find((p) => p.proj_id === projectId);

  const virtualLabLabel = (
    <>
      <span className="text-xl font-bold">Virtual Lab</span> <br />
      <span>{virtualLabDetails?.name ?? ''}</span>
    </>
  );
  const projectLabel = (
    <>
      <span className="text-xl">Project</span> <br />
      <span>{project?.name ?? ''}</span>
    </>
  );

  const availableAmount =
    transferType === TransferType.VLAB_TO_PROJECT
      ? parseFloat(virtualLabBalance?.data.balance ?? '0')
      : parseFloat(projectBalance?.balance ?? '0');

  return (
    <>
      <span className="text-2xl font-bold">Credit transfer</span>

      <div className="mt-8 flex w-full items-center justify-center">
        <div className="w-5/12">
          <span className="text-xl font-bold">From: </span>
          {transferType === TransferType.VLAB_TO_PROJECT ? virtualLabLabel : projectLabel}
        </div>

        <div className="flex w-2/12 items-center justify-center">
          <Button icon={<SwapOutlined />} onClick={toggleTransferType} />
        </div>

        <div className="w-5/12">
          <span className="text-xl font-bold">To: </span>
          {transferType === TransferType.VLAB_TO_PROJECT ? projectLabel : virtualLabLabel}
        </div>
      </div>

      <div className="mt-8">
        <span className="text-xl font-bold">Amount, credits</span> <br />
        <InputNumber
          className="my-2 block w-full"
          placeholder="0"
          value={amount}
          min={0.01}
          max={availableAmount}
          onChange={(value) => setAmount(value ?? 0)}
        />
        <span>
          Available:
          <button
            type="button"
            className="px-2 text-sm font-bold underline decoration-dashed"
            onClick={() => setAmount(availableAmount)}
          >
            {availableAmount}
          </button>
        </span>
      </div>

      <div className="mr-[-34px] mt-8 text-right">
        <Button
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-none border-none px-5 py-6 shadow-none"
        >
          Cancel
        </Button>
        <Button
          type="primary"
          className="ml-2 inline-flex items-center justify-center rounded-none bg-primary-8 px-8 py-6"
          disabled={!amount}
          onClick={transfer}
          loading={loading}
        >
          Transfer
        </Button>
      </div>
    </>
  );
}

const modalTheme = {
  token: {
    colorBgBase: 'white',
    colorTextBase: 'black',
  },
};

function useBalanceTransferModal() {
  const [modal, contextHolder] = Modal.useModal();
  const destroyRef = useRef<() => void>();
  const onClose = () => destroyRef?.current?.();

  const createModal = ({
    virtualLabId,
    projectId,
    onTransferSuccess,
  }: {
    virtualLabId: string;
    projectId: string;
    onTransferSuccess: () => Promise<void>;
  }) => {
    const { destroy } = modal.confirm({
      title: null,
      icon: null,
      closable: true,
      maskClosable: true,
      footer: null,
      width: 680,
      centered: true,
      mask: true,
      styles: {
        mask: { background: '#002766' },
        body: { padding: '60px 40px 20px' },
      },
      closeIcon: <CloseOutlined className="text-2xl text-primary-8" />,
      className: '![&>.ant-modal-content]:bg-red-500',
      content: (
        <BalanceTransferForm
          virtualLabId={virtualLabId}
          projectId={projectId}
          onClose={onClose}
          onTransferSuccess={onTransferSuccess}
        />
      ),
    });

    destroyRef.current = destroy;

    return destroy;
  };

  return {
    createModal,
    contextHolder: <ConfigProvider theme={modalTheme}>{contextHolder}</ConfigProvider>,
  };
}

function useVirtualLabTopUpModal() {
  const [modal, contextHolder] = Modal.useModal();
  const destroyRef = useRef<() => void>();
  const onClose = () => destroyRef?.current?.();

  const createModal = ({
    virtualLabId,
    onSuccess,
  }: {
    virtualLabId: string;
    onSuccess: () => Promise<void>;
  }) => {
    const { destroy } = modal.confirm({
      title: null,
      icon: null,
      closable: true,
      maskClosable: true,
      footer: null,
      width: 680,
      centered: true,
      mask: true,
      styles: {
        mask: { background: '#002766' },
        body: { padding: '60px 40px 20px' },
      },
      closeIcon: <CloseOutlined className="text-2xl text-primary-8" />,
      className: '![&>.ant-modal-content]:bg-red-500',
      content: (
        <VirtualLabTopUpForm virtualLabId={virtualLabId} onClose={onClose} onSuccess={onSuccess} />
      ),
    });

    destroyRef.current = destroy;

    return destroy;
  };

  return {
    createModal,
    contextHolder: <ConfigProvider theme={modalTheme}>{contextHolder}</ConfigProvider>,
  };
}

export default function CostsPanel({ virtualLabId }: { virtualLabId: string }) {
  const projectsObj = useUnwrappedValue(virtualLabProjectsAtomFamily(virtualLabId));
  const [virtualLabBalance, refreshBalance] = useVirtualLabBalance({ virtualLabId });

  const onBalanceChange = async () => refreshBalance();

  if (!projectsObj) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <VirtualLabBlock
        virtualLabId={virtualLabId}
        balance={virtualLabBalance?.data.balance ?? ''}
        onBalanceChange={onBalanceChange}
      />

      {projectsObj.results.map((project) => (
        <div key={project.id}>
          <Divider />
          <ProjectCard
            virtualLabId={virtualLabId}
            project={project}
            balance={virtualLabBalance?.data.projects?.find((p) => p.proj_id === project.id)}
            onBalanceChange={onBalanceChange}
          />

          <ErrorBoundary fallback={SimpleErrorComponent}>
            <JobReportList virtualLabId={virtualLabId} projectId={project.id} />
          </ErrorBoundary>
        </div>
      ))}
    </>
  );
}
