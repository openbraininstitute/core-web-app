import { useState } from 'react';
import { Button, InputNumber } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

import { useLastTruthyValue, useUnwrappedValue } from '@/hooks/hooks';
import { assignProjectBudget, reverseProjectBudget } from '@/services/virtual-lab/projects';
import { virtualLabBalanceAtomFamily, virtualLabDetailAtomFamily } from '@/state/virtual-lab/lab';
import { virtualLabProjectsAtomFamily } from '@/state/virtual-lab/projects';

enum TransferType {
  PROJECT_TO_VLAB = 'proj->vlab',
  VLAB_TO_PROJECT = 'vlab->proj',
}

export default function BalanceTransferForm({
  virtualLabId,
  projectId,
  onClose,
  onTransferSuccess,
}: {
  virtualLabId: string;
  projectId: string;
  onClose: () => void;
  onTransferSuccess: () => void;
}) {
  const projectsObj = useUnwrappedValue(virtualLabProjectsAtomFamily(virtualLabId));
  const virtualLabDetails = useUnwrappedValue(virtualLabDetailAtomFamily(virtualLabId));
  const virtualLabBalance = useLastTruthyValue(virtualLabBalanceAtomFamily({ virtualLabId }));

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
