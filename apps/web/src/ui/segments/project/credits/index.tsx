'use client';

import { useState } from 'react';

import { BalanceCard } from '@/ui/segments/project/credits/balance-card';
import {
  CreditsAction,
  CreditsTransferModal,
  type TCreditsAction,
} from '@/ui/segments/project/credits/credits-transfer-modal';
import { JobReportList } from '@/ui/segments/project/credits/job-report-list';

export function Credits() {
  const [creditsTab, setCreditsTab] = useState<TCreditsAction | null>(null);

  return (
    <div
      id="project-credits"
      data-testid="project-credits"
      className="flex flex-col gap-6 px-0 pr-1"
    >
      <BalanceCard
        onTransferCredits={() => setCreditsTab(CreditsAction.Transfer.key)}
        onBuyCredits={() => setCreditsTab(CreditsAction.Buy.key)}
      />
      <JobReportList />
      <CreditsTransferModal
        open={creditsTab !== null}
        action={creditsTab ?? CreditsAction.Transfer.key}
        onClose={() => setCreditsTab(null)}
      />
    </div>
  );
}

export default Credits;
