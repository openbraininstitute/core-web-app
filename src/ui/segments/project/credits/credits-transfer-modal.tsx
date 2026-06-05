'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { StripePaymentFlow } from '@/features/payments/standalone';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import {
  type ManageCreditsStepHandle,
  TransferCredits,
} from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import {
  PaymentModeSelection,
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { PromotionCode } from '@/ui/segments/virtual-lab-settings/elements/promotion-code-form';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type Props = {
  open: boolean;
  onClose: () => void;
};

function BuyCreditsTab({
  virtualLabId,
  onClose,
  mode,
  onModeChange,
  classnames,
}: {
  virtualLabId: string;
  onClose: () => void;
  mode: TPurchaseModeDictionary;
  onModeChange: (mode: TPurchaseModeDictionary) => void;
  classnames?: {
    mode?: {
      root?: string;
    };
    flow?: {
      root?: string;
      content?: string;
      emailVerification?: {
        codeForm?: string;
        requestForm?: string;
      };
    };
    promotion?: {
      root?: string;
      content?: string;
    };
  };
}) {
  const handleModeChange = (newMode: TPurchaseModeDictionary) => {
    // When user goes back to selection (either from cancel or after successful payment), close the modal
    if (newMode === PurchaseModeDictionary.Selection) {
      onClose();
    } else {
      onModeChange(newMode);
    }
  };

  // Override handleModeChange to prevent closing when going back via back button
  // Only close when coming from StripePaymentFlow or PromotionCode components
  const handleModeChangeFromComponents = (newMode: TPurchaseModeDictionary) => {
    // When user goes back to selection from components (cancel or success), close the modal
    if (newMode === PurchaseModeDictionary.Selection) {
      onClose();
    } else {
      onModeChange(newMode);
    }
  };

  const content = match({ mode })
    .with({ mode: PurchaseModeDictionary.Selection }, () => (
      <PaymentModeSelection
        virtualLabId={virtualLabId}
        onModeChange={handleModeChange}
        classnames={classnames?.mode}
      />
    ))
    .with({ mode: PurchaseModeDictionary.Buy }, () => (
      <StripePaymentFlow
        virtualLabId={virtualLabId}
        onModeChange={handleModeChangeFromComponents}
        classnames={classnames?.flow}
      />
    ))
    .with({ mode: PurchaseModeDictionary.Promo }, () => (
      <PromotionCode
        virtualLabId={virtualLabId}
        onModeChange={handleModeChangeFromComponents}
        classnames={classnames?.promotion}
      />
    ))
    .otherwise(() => null);

  return (
    <div className="flex h-full w-full flex-col" data-widget="buy-credits-form">
      <div className="w-full h-full" data-widget={mode}>
        {content}
      </div>
    </div>
  );
}

export function CreditsTransferModal({ open, onClose }: Props) {
  const creditsRef = useRef<ManageCreditsStepHandle>(null);
  const [activeTab, setActiveTab] = useState('transfer');
  const [buyMode, setBuyMode] = useState<TPurchaseModeDictionary>(PurchaseModeDictionary.Selection);

  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  // Reset buy mode when switching tabs or closing modal
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'buy') {
      setBuyMode(PurchaseModeDictionary.Selection);
    }
  };

  useEffect(() => {
    if (activeTab !== 'transfer') {
      return;
    }
  }, [activeTab]);

  const handleClose = () => {
    setBuyMode(PurchaseModeDictionary.Selection);
  };

  const onCloseModal = () => {
    setBuyMode(PurchaseModeDictionary.Selection);
    onClose();
  };

  return (
    <Modal
      maskClosable
      id="model-credits-manager"
      closable={false}
      open={open}
      title={
        <div className="flex w-full flex-col gap-4 select-none">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex flex-col items-start justify-between">
              <h2 className="text-2xl font-semibold text-primary-9">{project?.name}</h2>
              <p className="text-primary-9 text-sm font-light">
                Buy and transfer credits between your virtual lab and projects.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Button
                rounded
                size="md"
                variant="icon"
                onClick={onCloseModal}
                className="bg-white hover:bg-gray-100 border-gray-100"
              >
                <CloseOutlined className="text-lg text-primary-9!" />
              </Button>
            </div>
          </div>
          <PillTabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
            activationMode="manual"
          >
            <PillTabsList className="bg-gray-100 border border-gray-100 rounded-full grid h-12 w-full grid-cols-2 p-0 shadow-sm">
              <PillTabsTrigger
                value="transfer"
                className={cn(
                  'hover:bg-gray-200 bg-white hover:text-primary-8 data-[state=active]:text-white h-12 px-6 py-5',
                  'text-lg text-primary-9 select-none data-[state=active]:bg-primary-9 data-[state=active]:font-bold'
                )}
              >
                Transfer Credits
              </PillTabsTrigger>
              <PillTabsTrigger
                value="buy"
                className={cn(
                  'hover:bg-gray-200 bg-white hover:text-primary-8 data-[state=active]:text-white h-12 px-6 py-5',
                  'text-lg text-primary-9 select-none data-[state=active]:bg-primary-9 data-[state=active]:font-bold'
                )}
              >
                Buy Credits
              </PillTabsTrigger>
            </PillTabsList>
          </PillTabs>
        </div>
      }
      size="auto"
      onClose={onCloseModal}
      position="center"
      animation="scale"
      maxWidth={700}
      width={700}
      className={cn(
        'bg-white! fixed! top-1/2! left-1/2! z-1000! -translate-x-1/2! -translate-y-1/2! transform!',
        'h-190 rounded-2xl'
      )}
      headerClassName={cn('[&>div]:w-full')}
      overlayClassName="bg-primary-8/10 backdrop-blur-xs"
      bodyClassName="pt-0 max-h-[calc(100%-150px)] h-full secondary-scrollbar px-0"
    >
      <PillTabs
        value={activeTab}
        onValueChange={handleTabChange}
        activationMode="manual"
        className="h-full"
      >
        <PillTabsContent value="transfer" className="mt-0 h-full px-5 bg-white">
          <TransferCredits
            virtualLabId={virtualLabId}
            onBack={onCloseModal}
            shouldHaveBack={false}
            shouldShowSwap={false}
            ref={creditsRef}
            classnames={{
              root: 'bg-white px-0 pt-1 h-max',
              content: 'bg-white px-0 rounded-2xl',
              body: 'border-none bg-white p-0 px-2',
            }}
          />
        </PillTabsContent>
        <PillTabsContent value="buy" className="mt-0 h-full px-8 bg-white">
          <BuyCreditsTab
            virtualLabId={virtualLabId}
            onClose={handleClose}
            mode={buyMode}
            onModeChange={setBuyMode}
            classnames={{
              mode: {
                root: 'py-0',
              },
              flow: {
                root: 'pt-1 bg-white rounded-2xl [&_.back-button-wrapper]:pt-0',
                emailVerification: {
                  codeForm: 'px-10',
                  requestForm: 'pt-1 bg-white rounded-2xl [&_.back-button-wrapper]:pt-0 px-10',
                },
              },
              promotion: {
                root: 'pt-1 bg-white rounded-2xl [&_.back-button-wrapper]:pt-0',
              },
            }}
          />
        </PillTabsContent>
      </PillTabs>
    </Modal>
  );
}
