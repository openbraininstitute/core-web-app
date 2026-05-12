'use client';

import { match } from 'ts-pattern';

import { Invoices } from '@/ui/segments/profile/sections/invoices';
import { UserProfile } from '@/ui/segments/profile/sections/profile';
import { Subscription } from '@/ui/segments/profile/sections/subscription';
import {
  type TWorkspaceManagerSection,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';

export type TActiveSection = Extract<
  TWorkspaceManagerSection,
  'subscription' | 'invoices' | 'profile'
>;

type Props = {
  activeSection: TActiveSection;
  onExpandedChange: (expanded: boolean) => void;
};

export function AccountContent({ activeSection, onExpandedChange }: Props) {
  return match(activeSection)
    .with(WorkspaceManagerSectionDict.Subscription, () => (
      <div
        data-testid="workspace-manager-account-subscription-section"
        id="workspace-manager-account-subscription-section"
        className="mr-1 h-full overflow-hidden"
      >
        <Subscription onExpandedChange={onExpandedChange} />
      </div>
    ))
    .with(WorkspaceManagerSectionDict.Invoices, () => (
      <div
        data-testid="workspace-manager-account-invoices-section"
        id="workspace-manager-account-invoices-section"
        className="mr-1"
      >
        <Invoices />
      </div>
    ))
    .with(WorkspaceManagerSectionDict.Profile, () => (
      <div
        data-testid="workspace-manager-account-profile-section"
        id="workspace-manager-account-profile-section"
        className="mr-1"
      >
        <UserProfile />
      </div>
    ))
    .otherwise(() => null);
}
