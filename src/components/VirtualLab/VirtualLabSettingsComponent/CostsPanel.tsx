import { useRef, useState } from 'react';
import { ConfigProvider, Divider, Modal, Button, InputNumber } from 'antd';
import { useSetAtom } from 'jotai';

import { CloseOutlined } from '@ant-design/icons';
import { ProjectBalanceCard } from '../projects/VirtualLabProjectAdmin/ProjectBalanceCard';
import JobReportList from '../projects/VirtualLabProjectAdmin/ProjectJobReportList';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';
import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';
import { topUpVirtualLabAccount } from '@/services/virtual-lab/labs';
import EditIcon from '@/components/icons/Edit';
import { refreshBalanceAtom, virtualLabBalanceAtomFamily } from '@/state/virtual-lab/lab';

function VirtualLabBlock({ virtualLabId }: { virtualLabId: string }) {
  const virtualLabBalance = useLastTruthyValue(virtualLabBalanceAtomFamily({ virtualLabId }));
  const refreshBalance = useSetAtom(refreshBalanceAtom);

  const { createModal, contextHolder } = useVirtualLabTopUpModal();

  const openTopUpModal = () => {
    createModal({ virtualLabId, onSuccess: refreshBalance });
  };

  return (
    <div className="flex w-full justify-between border-2 border-primary-3 p-6 text-white">
      <h2 className="text-2xl font-bold">Virtual Lab</h2>

      <div className="flex items-stretch border border-primary-3">
        <div className="flex flex-col justify-center border-r border-primary-3 px-4 py-2 text-right">
          <p className="text-sm text-primary-2">Credit balance</p>
          <p className="text-lg font-semibold">{virtualLabBalance?.data.balance ?? ''}</p>
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

function VirtualLabTopUpForm({
  virtualLabId,
  onClose,
  onSuccess,
}: {
  virtualLabId: string;
  onClose: () => void;
  onSuccess: () => void;
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
      <h3 className="text-2xl font-bold">Virtual Lab account top-up</h3>
      <p className="text-warning">
        This is for demo purposes only. Will be replaced with payment provider integration
      </p>

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

const modalTheme = {
  token: {
    colorBgBase: 'white',
    colorTextBase: 'black',
  },
};

function useVirtualLabTopUpModal() {
  const [modal, contextHolder] = Modal.useModal();
  const destroyRef = useRef<() => void>();
  const onClose = () => destroyRef?.current?.();

  const createModal = ({
    virtualLabId,
    onSuccess,
  }: {
    virtualLabId: string;
    onSuccess: () => void;
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
  const virtualLabBalance = useLastTruthyValue(virtualLabBalanceAtomFamily({ virtualLabId }));

  if (!projectsObj || !virtualLabBalance) {
    return <div>Loading...</div>;
  }

  const getProject = (projectId: string) => {
    const project = projectsObj.results.find((p) => p.id === projectId);
    if (!project) throw new Error('Project not found');
    return project;
  };
  const getProjectBalance = (projectId: string) => {
    const balance = virtualLabBalance.data.projects?.find((p) => p.proj_id === projectId);
    if (!balance) throw new Error('Project balance not found');
    return balance;
  };

  return (
    <>
      <VirtualLabBlock virtualLabId={virtualLabId} />

      {projectsObj.results.map((project) => (
        <div key={project.id}>
          <Divider />
          <ProjectBalanceCard
            virtualLabId={virtualLabId}
            project={getProject(project.id)}
            balance={getProjectBalance(project.id)}
          />
          <JobReportList virtualLabId={virtualLabId} projectId={project.id} />
        </div>
      ))}
    </>
  );
}
