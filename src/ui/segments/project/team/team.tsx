'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { match } from 'ts-pattern';
import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { InviteMembers } from '@/ui/segments/project/team/team-invitation';
import { ListingMembers } from '@/ui/segments/project/team/team-listing';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

const StepDict = {
  Listing: 'listing',
  AddMember: 'add-member',
} as const;

type TStepDict = (typeof StepDict)[keyof typeof StepDict];

export function TeamManager() {
  const { virtualLabId, projectId } = useWorkspace();
  const [currentStep, setCurrentStep] = useState<TStepDict>(StepDict.Listing);

  const { data: currentProjectTeam } = useSuspenseQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
  });

  const handleAddMemberClick = () => setCurrentStep(StepDict.AddMember);
  const handleBackToListing = () => setCurrentStep(StepDict.Listing);

  return match(currentStep)
    .with(StepDict.Listing, () => (
      <ListingMembers onAddMemberClick={handleAddMemberClick} list={currentProjectTeam} />
    ))
    .with(StepDict.AddMember, () => (
      <div className="animate-fade-in h-full">
        <InviteMembers onBack={handleBackToListing} />
      </div>
    ))
    .otherwise(() => null);
}

export default TeamManager;
