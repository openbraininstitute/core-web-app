'use client';

import { useState } from 'react';

import { BalanceCard } from '@/ui/segments/project/credits/balance-card';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { JobReportList } from '@/ui/segments/project/credits/job-report-list';

export function Credits() {
  const [showCreditsManagement, setShowCreditsManagement] = useState(false);
  const handleTransferCredits = () => setShowCreditsManagement((prev) => !prev);

  return (
    <div
      id="project-credits"
      data-testid="project-credits"
      className="flex flex-col gap-6 px-0 pr-1"
    >
      <BalanceCard onTransferCredits={handleTransferCredits} />
      <JobReportList />
      <CreditsTransferModal open={showCreditsManagement} onClose={handleTransferCredits} />
    </div>
  );
}

export default Credits;
