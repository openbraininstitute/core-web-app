'use client';

import { useState } from 'react';

import { BalanceCard } from '@/ui/segments/project/credits/balance-card';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { JobReportList } from '@/ui/segments/project/credits/job-report-list';

export type CreditsVariant = 'dark' | 'light';

export function Credits({ variant = 'dark' }: { variant?: CreditsVariant }) {
  const [showCreditsManagement, setShowCreditsManagement] = useState(false);
  const handleTransferCredits = () => setShowCreditsManagement((prev) => !prev);

  return (
    <div
      id="project-credits"
      data-testid="project-credits"
      className="flex min-h-0 flex-1 items-start gap-6 px-0 pr-1"
    >
      <div className="w-1/2 min-w-0">
        <BalanceCard onTransferCredits={handleTransferCredits} variant={variant} />
      </div>
      <div className="flex h-full min-h-0 w-1/2 min-w-0 flex-col">
        <JobReportList variant={variant} />
      </div>
      <CreditsTransferModal open={showCreditsManagement} onClose={handleTransferCredits} />
    </div>
  );
}

export default Credits;
