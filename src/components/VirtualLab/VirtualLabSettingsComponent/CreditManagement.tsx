import { useCallback, useMemo } from 'react';
import { useSetAtom } from 'jotai';
import { RetweetOutlined } from '@ant-design/icons';

import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';
import { refreshBalanceAtom, virtualLabBalanceAtomFamily } from '@/state/virtual-lab/lab';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';
import { ProjectBalance } from '@/types/accounting';
import useBalanceTransferModal from '@/hooks/virtual-labs/project';

export default function CreditManagement({ virtualLabId }: { virtualLabId: string }) {
  const projectsObj = useUnwrappedValue(virtualLabProjectsAtomFamily(virtualLabId));
  const virtualLabBalance = useLastTruthyValue(virtualLabBalanceAtomFamily({ virtualLabId }));
  const refreshBalance = useSetAtom(refreshBalanceAtom);
  const { createModal, contextHolder } = useBalanceTransferModal();

  const openBalanceTransferModal = useCallback(
    (projectId: string) => {
      createModal({
        virtualLabId,
        projectId,
        onTransferSuccess: refreshBalance,
      });
    },
    [createModal, refreshBalance, virtualLabId]
  );

  const balanceMap = useMemo(
    () =>
      (virtualLabBalance?.data.projects ?? []).reduce(
        (map, p) => map.set(p.proj_id, p),
        new Map<string, ProjectBalance>()
      ),
    [virtualLabBalance]
  );

  const balanceRenderFn = useCallback(
    (projectId: string) => <span>{balanceMap.get(projectId)?.balance ?? 0}</span>,
    [balanceMap]
  );

  const actionsRenderFn = useCallback(
    (projectId: string) => (
      <>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center border border-primary-5 hover:bg-primary-7"
          onClick={() => openBalanceTransferModal(projectId)}
          aria-label="Transfer credits"
        >
          <RetweetOutlined />
        </button>
      </>
    ),
    [openBalanceTransferModal]
  );

  if (!projectsObj || !virtualLabBalance) {
    return <div className="py-10">Loading...</div>;
  }

  return (
    <div className="py-10">
      <div className="flex gap-x-4 px-8 py-4 text-sm text-primary-1">
        <div className="flex-1">Project</div>
        <div className="w-48 flex-none">Current credit balance</div>
        <div className="w-32 flex-none">Actions</div>
      </div>
      {projectsObj?.results.map((project) => (
        <div
          key={project.id}
          className="mt-4 flex gap-x-4 border border-primary-7 px-8 py-5 text-xl text-white"
        >
          <div className="flex-1 overflow-hidden truncate text-ellipsis font-bold">
            {project.name}
          </div>
          <div className="w-48 flex-none">{balanceRenderFn(project.id)}</div>
          <div className="w-32 flex-none">{actionsRenderFn(project.id)}</div>
        </div>
      ))}

      {contextHolder}
    </div>
  );
}
