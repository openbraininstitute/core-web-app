'use client';

import { CloseOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import {
  ManageCreditsStep,
  ManageCreditsStepHandle,
} from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Modal } from '@/ui/molecules/modal';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CreditsTransferModal({ open, onClose }: Props) {
  const creditsRef = useRef<ManageCreditsStepHandle>(null);

  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  return (
    <Modal
      closable={false}
      open={open}
      title={
        <div className="flex w-full items-center justify-between gap-4 select-none">
          <div className="flex flex-col items-start justify-between">
            <h2 className="text-2xl font-bold text-white">{project?.data.project.name}</h2>
            <p className="text-neutral-1 text-sm font-light">
              Transfer credits between your virtual lab and projects.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => creditsRef.current?.swap()}
              className="bg-primary-9 hover:bg-neutral-1/40 border-none !p-2"
              disabled={creditsRef.current?.isPending}
            >
              <SwapOutlined className="text-sm text-white!" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="bg-primary-9 hover:bg-neutral-1/40 border-none !p-2"
            >
              <CloseOutlined className="text-lg text-white!" />
            </Button>
          </div>
        </div>
      }
      size="auto"
      position="center"
      animation="scale"
      maxWidth={700}
      width={700}
      className="!bg-primary-9 !fixed !top-1/2 !left-1/2 !z-[1000] !-translate-x-1/2 !-translate-y-1/2 !transform"
      headerClassName={cn('[&>div]:w-full')}
    >
      <ManageCreditsStep
        virtualLabId={virtualLabId}
        onBack={onClose}
        shouldHaveBack={false}
        shouldShowSwap={false}
        buttonClassname="mt-20"
        ref={creditsRef}
      />
    </Modal>
  );
}
