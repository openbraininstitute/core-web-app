'use client';

import { CloseOutlined } from '@ant-design/icons';
import noop from 'lodash/noop';

import { ManageCreditsStep } from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Modal } from '@/ui/molecules/modal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreditsTransferModal({ open, onClose }: Props) {
  const { virtualLabId } = useWorkspace();

  return (
    <Modal
      open={open}
      title={
        <div className="flex flex-col items-start justify-between">
          <h2 className="text-2xl font-bold text-white">Transfer Credits</h2>
          <p className="text-neutral-1 text-sm font-light">
            Transfer credits between your virtual lab and projects.
          </p>
        </div>
      }
      onClose={onClose}
      size="auto"
      position="center"
      animation="scale"
      maxWidth={700}
      width={700}
      className="!bg-primary-9 !fixed !top-1/2 !left-1/2 !z-[1000] !-translate-x-1/2 !-translate-y-1/2 !transform"
      closable
      closeIcon={<CloseOutlined className="text-lg text-white" />}
      closeIconClassName="hover:bg-neutral-1/40"
    >
      <ManageCreditsStep virtualLabId={virtualLabId} onBack={noop} shouldHaveBack={false} />
    </Modal>
  );
}
