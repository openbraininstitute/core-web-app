'use client';

import { match } from 'ts-pattern';

import { ExperimentalFeatures } from '@/ui/segments/profile/sections/experimental-features';
import { Invoices } from '@/ui/segments/profile/sections/invoices';
import { UserProfile } from '@/ui/segments/profile/sections/profile';
import { Subscription } from '@/ui/segments/profile/sections/subscription';
import {
  type TWorkspaceManagerSection,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';

export type TActiveSection = Extract<
  TWorkspaceManagerSection,
  'subscription' | 'invoices' | 'profile' | 'experimental-features'
>;

type Props = {
  activeSection: TActiveSection;
  onExpandedChange: (expanded: boolean) => void;
};

export function AccountContent({ activeSection, onExpandedChange }: Props) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {match(activeSection)
        .with(WorkspaceManagerSectionDict.Subscription, () => (
          <div
            data-testid="workspace-manager-account-subscription-section"
            id="workspace-manager-account-subscription-section"
            className="mr-1 flex min-h-0 flex-1 flex-col"
          >
            <Subscription onExpandedChange={onExpandedChange} />
          </div>
        ))
        .with(WorkspaceManagerSectionDict.Invoices, () => (
          <div
            data-testid="workspace-manager-account-invoices-section"
            id="workspace-manager-account-invoices-section"
            className="mr-1 flex min-h-0 flex-1 flex-col"
          >
            <Invoices />
          </div>
        ))
        .with(WorkspaceManagerSectionDict.Profile, () => (
          <div
            data-testid="workspace-manager-account-profile-section"
            id="workspace-manager-account-profile-section"
            className="mr-1 flex min-h-0 flex-1 flex-col"
          >
            <UserProfile />
          </div>
        ))
        .with(WorkspaceManagerSectionDict.ExperimentalFeatures, () => (
          <div
            data-testid="workspace-manager-account-experimental-features-section"
            id="workspace-manager-account-experimental-features-section"
            className="mr-1 flex min-h-0 flex-1 flex-col"
          >
            <ExperimentalFeatures />
          </div>
        ))
        .otherwise(() => null)}
    </div>
  );
}
