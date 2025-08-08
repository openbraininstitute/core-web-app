'use client';

import { match, P } from 'ts-pattern';
import { useState } from 'react';

import { CreditsManagement } from '@/ui/segments/virtual-lab-settings/elements/credits-management';
import { PurchasesHistory } from '@/ui/segments/virtual-lab-settings/elements/payment-history';
import { ManageCreditsStep } from '@/ui/segments/virtual-lab-settings/sections/manage-credits';
import { BuyCreditsStep } from '@/ui/segments/virtual-lab-settings/sections/buy-credits';

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

  const handleManageProjectCreditsClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentStep(CreditsStep.ManageCredits);
  };

  const handleBackToListing = () => {
    setCurrentStep(CreditsStep.ListingCredits);
    setSelectedProjectId(null);
  };

  return match({ currentStep, selectedProjectId })
    .with({ currentStep: CreditsStep.BuyCredits }, () => {
      return <BuyCreditsStep virtualLabId={virtualLabId} onBack={handleBackToListing} />;
    })
    .with(
      {
        currentStep: CreditsStep.ManageCredits,
        selectedProjectId: P.not(P.nullish).select('projectId'),
      },
      ({ projectId }) => {
        return (
          <ManageCreditsStep
            virtualLabId={virtualLabId}
            projectId={projectId}
            onBack={handleBackToListing}
          />
        );
      }
    )
    .otherwise(() => (
      <div className="h-full grow px-6 py-3">
        <CreditsManagement
          virtualLabId={virtualLabId}
          onTransferCreditsClick={() => handleTransferClick()}
          onManageProjectCreditsClick={({ projectId }) =>
            handleManageProjectCreditsClick(projectId)
          }
        />
        <PurchasesHistory virtualLabId={virtualLabId} />
      </div>
    ));
}

export default Credits;
