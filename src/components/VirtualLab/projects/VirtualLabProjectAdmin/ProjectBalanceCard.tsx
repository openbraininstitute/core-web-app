import { useCallback } from 'react';
import { useSetAtom } from 'jotai';

import EditIcon from '@/components/icons/Edit';
import useBalanceTransferModal from '@/hooks/virtual-labs/project';
import { ProjectBalance } from '@/types/virtual-lab/accounting';
import { Project } from '@/types/virtual-lab/projects';
import {
  projectBalanceAtomFamily,
  virtualLabProjectDetailsAtomFamily,
} from '@/state/virtual-lab/projects';
import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';
import { refreshBalanceAtom } from '@/state/virtual-lab/lab';

export function ProjectBalanceCard({
  virtualLabId,
  project,
  balance,
}: {
  virtualLabId: string;
  project: Project;
  balance: ProjectBalance;
}) {
  const refreshBalance = useSetAtom(refreshBalanceAtom);

  const {
    createModal: createBalanceTransferModal,
    contextHolder: balanceTransferModalContextHolder,
  } = useBalanceTransferModal();

  const onBalanceTransferClick = useCallback(() => {
    createBalanceTransferModal({
      virtualLabId,
      projectId: project.id,
      onTransferSuccess: refreshBalance,
    });
  }, [createBalanceTransferModal, virtualLabId, project.id, refreshBalance]);

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

export function ProjectBalanceCardWithFetching({
  virtualLabId,
  projectId,
}: {
  virtualLabId: string;
  projectId: string;
}) {
  const balance = useLastTruthyValue(projectBalanceAtomFamily({ virtualLabId, projectId }));
  const project = useUnwrappedValue(
    virtualLabProjectDetailsAtomFamily({ virtualLabId, projectId })
  );

  if (!project || !balance) {
    return <div>Loading...</div>;
  }

  return <ProjectBalanceCard virtualLabId={virtualLabId} project={project} balance={balance} />;
}
