'use client';

import { match } from 'ts-pattern';

import { Credits } from '@/ui/segments/virtual-lab-settings/sections/credits';
import { VirtualLabOverview } from '@/ui/segments/virtual-lab-settings/sections/form';
import { TeamTable } from '@/ui/segments/virtual-lab-settings/sections/team';
import {
  type TWorkspaceManagerSection,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';

export type TActiveSection = Extract<TWorkspaceManagerSection, 'overview' | 'members' | 'credits'>;

type Props = {
  activeSection: TActiveSection;
  targetVirtualLabId: string;
};

export function VirtualLabContent({ activeSection, targetVirtualLabId }: Props) {
  return match(activeSection)
    .with(WorkspaceManagerSectionDict.Members, () => (
      <div
        data-testid="workspace-manager-virtual-lab-members-section"
        id="workspace-manager-virtual-lab-members-section"
        className="h-full grow overflow-hidden"
      >
        <TeamTable virtualLabId={targetVirtualLabId} />
      </div>
    ))
    .with(WorkspaceManagerSectionDict.Credits, () => (
      <div
        data-testid="workspace-manager-virtual-lab-credits-section"
        id="workspace-manager-virtual-lab-credits-section"
        className="h-full grow overflow-hidden"
      >
        <Credits virtualLabId={targetVirtualLabId} />
      </div>
    ))
    .with(WorkspaceManagerSectionDict.Overview, () => (
      <div
        data-testid="workspace-manager-virtual-lab-overview-section"
        id="workspace-manager-virtual-lab-overview-section"
        className="h-full grow overflow-hidden"
      >
        <VirtualLabOverview virtualLabId={targetVirtualLabId} />
      </div>
    ))
    .exhaustive();
}
