'use client';

import { ArrowLeftOutlined, CloseOutlined, SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { JobReportList } from '@/ui/segments/project/credits/job-report-list';
import {
  ManageCreditsStep,
  type ManageCreditsStepHandle,
} from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import {
  PaymentModeSelection,
  PurchaseModeDictionary,
  type TPurchaseModeDictionary,
} from '@/ui/segments/virtual-lab-settings/elements/payment-mode-selection';
import { PromotionCode } from '@/ui/segments/virtual-lab-settings/elements/promotion-code-form';
import { StripePaymentFlow } from '@/ui/segments/virtual-lab-settings/elements/stripe-payment';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type CreditsTab = 'overview' | 'transfer' | 'buy';

type Props = {
  open: boolean;
  onClose: () => void;
  defaultTab?: CreditsTab;
};

function BuyCreditsTab({
  virtualLabId,
  onClose,
  mode,
  onModeChange,
}: {
  virtualLabId: string;
  onClose: () => void;
  mode: TPurchaseModeDictionary;
  onModeChange: (mode: TPurchaseModeDictionary) => void;
}) {
  const handleModeChange = (newMode: TPurchaseModeDictionary) => {
    // When user goes back to selection (either from cancel or after successful payment), close the modal
    if (newMode === PurchaseModeDictionary.Selection) {
      onClose();
    } else {
      onModeChange(newMode);
    }
  };

  const handleBackToSelection = () => {
    // Directly set mode to Selection without triggering close
    onModeChange(PurchaseModeDictionary.Selection);
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

  const showBackButton =
    mode === PurchaseModeDictionary.Buy || mode === PurchaseModeDictionary.Promo;

  const content = match({ mode })
    .with({ mode: PurchaseModeDictionary.Selection }, () => (
      <PaymentModeSelection virtualLabId={virtualLabId} onModeChange={handleModeChange} />
    ))
    .with({ mode: PurchaseModeDictionary.Buy }, () => (
      <StripePaymentFlow
        virtualLabId={virtualLabId}
        onModeChange={handleModeChangeFromComponents}
      />
    ))
    .with({ mode: PurchaseModeDictionary.Promo }, () => (
      <PromotionCode virtualLabId={virtualLabId} onModeChange={handleModeChangeFromComponents} />
    ))
    .otherwise(() => null);

  return (
    <div className="flex h-full w-full flex-col" data-widget="buy-credits-form">
      {showBackButton && (
        <div className="mb-4 flex items-center">
          <Button
            rounded
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBackToSelection}
            className="hover:bg-neutral-2/20 h-auto px-4! py-2! text-white hover:text-white"
          >
            <ArrowLeftOutlined className="text-lg" />
            <span className="ml-2 text-base font-semibold text-white select-none">Back</span>
          </Button>
        </div>
      )}
      <div className="w-full h-full" data-widget={mode}>
        {content}
      </div>
    </div>
  );
}

export function CreditsTransferModal({ open, onClose, defaultTab = 'transfer' }: Props) {
  const creditsRef = useRef<ManageCreditsStepHandle>(null);
  const [activeTab, setActiveTab] = useState<CreditsTab>(defaultTab);
  const [buyMode, setBuyMode] = useState<TPurchaseModeDictionary>(PurchaseModeDictionary.Selection);

  const { virtualLabId, projectId } = useWorkspace();
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
  });

  // Reset buy mode when switching tabs or closing modal
  const handleTabChange = (tab: string) => {
    setActiveTab(tab as CreditsTab);
    if (tab !== 'buy') {
      setBuyMode(PurchaseModeDictionary.Selection);
    }
  };

  // Reset buy mode when modal closes
  useEffect(() => {
    if (!open) {
      setBuyMode(PurchaseModeDictionary.Selection);
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  return (
    <Modal
      id="model-credits-manager"
      closable={false}
      open={open}
      onClose={onClose}
      title={
        <div className="flex w-full flex-col gap-4 select-none">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex flex-col items-start justify-between">
              <h2 className="text-2xl font-bold text-white">{project?.data.project.name}</h2>
              <p className="text-neutral-1 text-sm font-light">
                Buy and transfer credits between your virtual lab and projects.
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
            onValueChange={handleTabChange}
            className="w-full"
            activationMode="manual"
          >
            <PillTabsList className="bg-primary-8 grid h-12 w-full grid-cols-3 p-0">
              <PillTabsTrigger
                value="transfer"
                className="hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-12 px-6 py-5 text-lg text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold"
              >
                Transfer Credits
              </PillTabsTrigger>
              <PillTabsTrigger
                value="overview"
                className="hover:bg-neutral-1 hover:text-primary-8 data-[state=active]:text-primary-9 h-12 px-6 py-5 text-lg text-white select-none data-[state=active]:bg-white data-[state=active]:font-bold"
              >
                Credits usage
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
      className={cn(
        'bg-primary-9! fixed! top-1/2! left-1/2! z-1000! -translate-x-1/2! -translate-y-1/2! transform!',
        'h-190'
      )}
      headerClassName={cn('[&>div]:w-full')}
      bodyClassName="pt-0 max-h-[calc(100%-130px)] h-full"
    >
      <PillTabs
        value={activeTab}
        onValueChange={handleTabChange}
        activationMode="manual"
        className="h-full"
      >
        <PillTabsContent value="overview" className="mt-0 flex h-full flex-col overflow-hidden">
          <Suspense>
            <div className="flex min-h-0 flex-1 flex-col gap-6 pb-2 [&_h3]:text-white">
              <JobReportList />
            </div>
          </Suspense>
        </PillTabsContent>
        <PillTabsContent value="transfer" className="mt-0 h-full">
          <div className="flex flex-col h-full">
            <div className="mb-4 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => creditsRef.current?.swap()}
                className="bg-primary-8 hover:bg-neutral-1/40 border-white/20 p-2!"
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
              buttonClassname="mt-10"
              ref={creditsRef}
            />
          </div>
        </PillTabsContent>
        <PillTabsContent value="buy" className="mt-0 h-full">
          <BuyCreditsTab
            virtualLabId={virtualLabId}
            onClose={onClose}
            mode={buyMode}
            onModeChange={setBuyMode}
          />
        </PillTabsContent>
      </PillTabs>
    </Modal>
  );
}
