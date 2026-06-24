'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { match } from 'ts-pattern';

import { PricingButton } from '@/features/credits';
import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { PillTabs, PillTabsContent, PillTabsList, PillTabsTrigger } from '@/ui/molecules/tabs';
import { BuyCredits } from '@/ui/segments/virtual-lab-settings/elements/buy-credits';
import { CreditsDistribution } from '@/ui/segments/virtual-lab-settings/elements/credits-distribution';
import { TransferCredits } from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import { PurchasesHistory } from '@/ui/segments/virtual-lab-settings/elements/payment-history';
import {
  type TWorkspaceManagerCreditsPanel,
  WorkspaceManagerCreditsPanelDict,
} from '@/ui/segments/workspaces/space-manager/constants';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

type Props = {
  virtualLabId: string;
  creditsPanel?: TWorkspaceManagerCreditsPanel;
  onCreditsPanelChange?: (panel: TWorkspaceManagerCreditsPanel) => void;
};

const CreditsStep = {
  BuyCredits: 'buy-credits',
  ManageCredits: 'manage-credits',
  PurchaseHistory: 'purchase-history',
} as const;

type TCreditsStep = (typeof CreditsStep)[keyof typeof CreditsStep];

const ListingTab = {
  Credits: 'credits',
  Purchases: 'purchases',
} as const;
type TListingTab = (typeof ListingTab)[keyof typeof ListingTab];

function panelToStep(panel: TWorkspaceManagerCreditsPanel): TCreditsStep {
  return match(panel)
    .with(WorkspaceManagerCreditsPanelDict.Buy, () => CreditsStep.BuyCredits)
    .with(WorkspaceManagerCreditsPanelDict.Transfer, () => CreditsStep.ManageCredits)
    .with(WorkspaceManagerCreditsPanelDict.History, () => CreditsStep.PurchaseHistory)
    .exhaustive();
}

function stepToPanel(step: TCreditsStep): TWorkspaceManagerCreditsPanel {
  return match(step)
    .with(CreditsStep.BuyCredits, () => WorkspaceManagerCreditsPanelDict.Buy)
    .with(CreditsStep.ManageCredits, () => WorkspaceManagerCreditsPanelDict.Transfer)
    .with(CreditsStep.PurchaseHistory, () => WorkspaceManagerCreditsPanelDict.History)
    .exhaustive();
}

type ListingSectionProps = {
  virtualLabId: string;
  listingTab: TListingTab;
  setListingTab: (tab: TListingTab) => void;
};

function History({ virtualLabId, listingTab, setListingTab }: ListingSectionProps) {
  const { isVirtualLabAdmin: isAdmin } = useWorkspaceMembership({ virtualLabId });
  const { data: accounting, isLoading: balanceLoading } = useQuery({
    queryKey: keyBuilder.accounting({ virtualLabId }),
    queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: true }),
    enabled: isAdmin,
  });

  const rawBalance = accounting?.data?.balance;
  const displayBalance = !isAdmin ? '—' : balanceLoading ? '…' : (rawBalance ?? '0');

  return (
    <section
      id="purchase-history-header"
      data-testid="purchase-history-header"
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-3.5 rounded-2xl bg-white p-4"
    >
      <div
        id="purchase-history-content"
        data-testid="purchase-history-content"
        className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col"
      >
        <PillTabs
          value={listingTab}
          onValueChange={(v) => setListingTab(v as TListingTab)}
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-0"
        >
          <header
            className="flex shrink-0 flex-col gap-3 pb-4"
            data-testid="credits-listing-header"
          >
            <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 pl-2 gap-y-3">
              <div className="flex min-w-0 shrink-0 flex-wrap items-baseline gap-2">
                <span className="text-base font-medium text-gray-600">Credits</span>
                <span className="text-lg font-bold tabular-nums text-primary-9">
                  {displayBalance}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <PricingButton />

                <PillTabsList
                  className="ml-auto grid p-0 w-full h-10 max-w-max shrink-0 grid-cols-2 rounded-full border border-gray-100 hover:border-gray-300 shadow-sm bg-white text-primary-9"
                  data-testid="credits-listing-tabs"
                >
                  <PillTabsTrigger
                    value={ListingTab.Credits}
                    className="rounded-l-full h-full px-3 py-0 rounded-r-none text-sm font-semibold text-primary-9/80 data-[state=active]:bg-gray-100 data-[state=active]:text-primary-9 data-[state=active]:shadow-sm"
                  >
                    Credits
                  </PillTabsTrigger>
                  <PillTabsTrigger
                    value={ListingTab.Purchases}
                    className="rounded-r-full h-full px-3 py-0 rounded-l-none text-sm font-semibold text-primary-9/80 data-[state=active]:bg-gray-100 data-[state=active]:text-primary-9 data-[state=active]:shadow-sm"
                  >
                    Purchases
                  </PillTabsTrigger>
                </PillTabsList>
              </div>
            </div>
          </header>

          <PillTabsContent
            value={ListingTab.Credits}
            className="mt-1 flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden"
            data-testid="credits-listing-tab-credits"
          >
            <CreditsDistribution virtualLabId={virtualLabId} />
          </PillTabsContent>
          <PillTabsContent
            value={ListingTab.Purchases}
            className="mt-1 flex min-h-0 flex-1 flex-col outline-none data-[state=inactive]:hidden"
            data-testid="credits-listing-tab-purchases"
          >
            <PurchasesHistory virtualLabId={virtualLabId} />
          </PillTabsContent>
        </PillTabs>
      </div>
    </section>
  );
}

export function Credits({ virtualLabId, creditsPanel, onCreditsPanelChange }: Props) {
  const [innerStep, setInnerStep] = useState<TCreditsStep>(CreditsStep.PurchaseHistory);
  const [listingTab, setListingTab] = useState<TListingTab>(ListingTab.Credits);
  const isWorkspaceControlled = creditsPanel !== undefined && onCreditsPanelChange !== undefined;

  const currentStep = isWorkspaceControlled ? panelToStep(creditsPanel) : innerStep;

  const navigateTo = (step: TCreditsStep) => {
    if (isWorkspaceControlled) {
      onCreditsPanelChange(stepToPanel(step));
    } else {
      setInnerStep(step);
    }
  };

  const handleBackToListing = () => {
    navigateTo(CreditsStep.PurchaseHistory);
  };

  return match(currentStep)
    .with(CreditsStep.BuyCredits, () => (
      <div className="flex h-max min-h-0 flex-1 flex-col">
        <BuyCredits virtualLabId={virtualLabId} onBack={handleBackToListing} />
      </div>
    ))
    .with(CreditsStep.ManageCredits, () => (
      <div className="flex h-max min-h-0 flex-1 flex-col">
        <TransferCredits virtualLabId={virtualLabId} onBack={handleBackToListing} />
      </div>
    ))
    .with(CreditsStep.PurchaseHistory, () => (
      <History virtualLabId={virtualLabId} listingTab={listingTab} setListingTab={setListingTab} />
    ))
    .exhaustive();
}

export default Credits;
