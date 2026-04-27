'use client';

import { Suspense, useState } from 'react';

import { ProjectCard } from '@/ui/segments/project/banner/banner';
import { ProjectCardSkeletonShimmer } from '@/ui/segments/project/banner/banner-skeleton';
import { BalanceCard } from '@/ui/segments/project/credits/balance-card';
import { CreditsTransferModal } from '@/ui/segments/project/credits/credits-transfer-modal';
import { JobReportList } from '@/ui/segments/project/credits/job-report-list';
import { DiscussionThread } from '@/ui/segments/project/discussion-thread';

export type CreditsVariant = 'dark' | 'light';

export function Credits({
  variant = 'dark',
  canViewCredits = true,
}: {
  variant?: CreditsVariant;
  canViewCredits?: boolean;
}) {
  const [creditsModal, setCreditsModal] = useState<{
    open: boolean;
    tab: 'transfer' | 'buy';
  }>({ open: false, tab: 'transfer' });
  const handleTransferCredits = () => setCreditsModal({ open: true, tab: 'transfer' });
  const handleBuyCredits = () => setCreditsModal({ open: true, tab: 'buy' });
  const handleCloseModal = () => setCreditsModal((prev) => ({ ...prev, open: false }));

  return (
    <div
      id="project-credits"
      data-testid="project-credits"
      className="flex min-h-0 flex-1 items-start gap-6 px-0 pr-1"
    >
      <div className="flex h-full min-h-0 w-1/2 min-w-0 flex-col gap-4">
        <Suspense fallback={<ProjectCardSkeletonShimmer />}>
          <ProjectCard />
        </Suspense>
        <DiscussionThread />
      </div>
      <div className="flex h-full min-h-0 w-1/2 min-w-0 flex-col gap-4">
        <BalanceCard
          onTransferCredits={handleTransferCredits}
          onBuyCredits={handleBuyCredits}
          variant={variant}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <JobReportList variant={variant} />
        </div>
      </div>
      {canViewCredits && (
        <CreditsTransferModal
          open={creditsModal.open}
          onClose={handleCloseModal}
          defaultTab={creditsModal.tab}
        />
      )}
    </div>
  );
}

export default Credits;
