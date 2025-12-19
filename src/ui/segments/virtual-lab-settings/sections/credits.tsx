'use client';

import { useState } from 'react';
import { match } from 'ts-pattern';
import { BuyCredits } from '@/ui/segments/virtual-lab-settings/elements/buy-credits';
import { CreditsManagement } from '@/ui/segments/virtual-lab-settings/elements/credits-management';
import { ManageCreditsStep } from '@/ui/segments/virtual-lab-settings/elements/manage-credits';
import { PurchasesHistory } from '@/ui/segments/virtual-lab-settings/elements/payment-history';

type Props = {
  virtualLabId: string;
};

const CreditsStep = {
  BuyCredits: 'buy-credits',
  ManageCredits: 'manage-credits',
  ListingCredits: 'listing-credits',
} as const;

type TCreditsStep = (typeof CreditsStep)[keyof typeof CreditsStep];

export function Credits({ virtualLabId }: Props) {
  const [currentStep, setCurrentStep] = useState<TCreditsStep>(CreditsStep.ListingCredits);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleTransferClick = () => {
    setCurrentStep(CreditsStep.BuyCredits);
  };

  const handleManageProjectCreditsClick = () => {
    setCurrentStep(CreditsStep.ManageCredits);
  };

  const handleBackToListing = () => {
    setCurrentStep(CreditsStep.ListingCredits);
    setSelectedProjectId(null);
  };

  return match({ currentStep, selectedProjectId })
    .with({ currentStep: CreditsStep.BuyCredits }, () => {
      return <BuyCredits virtualLabId={virtualLabId} onBack={handleBackToListing} />;
    })
    .with(
      {
        currentStep: CreditsStep.ManageCredits,
      },
      () => {
        return <ManageCreditsStep virtualLabId={virtualLabId} onBack={handleBackToListing} />;
      },
    )
    .otherwise(() => (
      <div className="h-full grow px-6 py-3">
        <CreditsManagement
          virtualLabId={virtualLabId}
          onTransferCreditsClick={() => handleTransferClick()}
          onManageProjectCreditsClick={() => handleManageProjectCreditsClick()}
        />
        <PurchasesHistory virtualLabId={virtualLabId} />
      </div>
    ));
}

export default Credits;
