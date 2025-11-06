'use client';

import { CloseOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import {
  ManageCreditsStep,
  ManageCreditsStepHandle,
} from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import {
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { StripePaymentFlow } from '@/ui/segments/virtual-lab-settings/elements/stripe-payment';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type Props = {
  open: boolean;
  onClose: () => void;
};

function BuyCreditsTab({ virtualLabId, onClose }: { virtualLabId: string; onClose: () => void }) {
  const handleModeChange = (mode: TPurchaseModeDictionary) => {
    // When user goes back to selection (either from cancel or after successful payment), close the modal
    if (mode === PurchaseModeDictionary.Selection) {
      onClose();
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <StripePaymentFlow virtualLabId={virtualLabId} onModeChange={handleModeChange} />
    </div>
  );
}

export function CreditsTransferModal({ open, onClose }: Props) {
  const creditsRef = useRef<ManageCreditsStepHandle>(null);
  const [activeTab, setActiveTab] = useState('transfer');

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
        <div className="flex w-full flex-col gap-4 select-none">
          <div className="flex w-full items-center justify-between gap-4">
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
                onClick={onClose}
                className="bg-primary-9 hover:bg-neutral-1/40 border-none !p-2"
              >
                <CloseOutlined className="text-lg text-white!" />
              </Button>
            </div>
          </div>
          <PillTabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
            activationMode="manual"
          >
            <PillTabsList className="bg-primary-8 grid h-12 w-full grid-cols-2 p-0">
              <PillTabsTrigger
                value="transfer"
                className="hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-12 px-6 py-5 text-lg text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold"
              >
                Transfer Credits
              </PillTabsTrigger>
              <PillTabsTrigger
                value="buy"
                className="hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-12 px-6 py-5 text-lg text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold"
              >
                Buy Credits
              </PillTabsTrigger>
            </PillTabsList>
          </PillTabs>
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
      <PillTabs value={activeTab} onValueChange={setActiveTab} activationMode="manual">
        <PillTabsContent value="transfer">
          <div className="flex flex-col">
            <div className="mb-4 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => creditsRef.current?.swap()}
                className="bg-primary-8 hover:bg-neutral-1/40 border-white/20 !p-2"
                disabled={creditsRef.current?.isPending}
              >
                <SwapOutlined className="text-sm text-white!" />
              </Button>
            </div>
            <ManageCreditsStep
              virtualLabId={virtualLabId}
              onBack={onClose}
              shouldHaveBack={false}
              shouldShowSwap={false}
              buttonClassname="mt-20"
              ref={creditsRef}
            />
          </div>
        </PillTabsContent>
        <PillTabsContent value="buy">
          <BuyCreditsTab virtualLabId={virtualLabId} onClose={onClose} />
        </PillTabsContent>
      </PillTabs>
    </Modal>
  );
}
