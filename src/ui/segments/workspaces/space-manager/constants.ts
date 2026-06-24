export const WorkspaceManagerKindDict = {
  Account: 'account',
  Project: 'project',
  VirtualLab: 'virtual-lab',
} as const;

export type TWorkspaceManagerKind =
  (typeof WorkspaceManagerKindDict)[keyof typeof WorkspaceManagerKindDict];

export const WorkspaceManagerSectionDict = {
  Credits: 'credits',
  ExperimentalFeatures: 'experimental-features',
  Invoices: 'invoices',
  Activities: 'activities',
  Members: 'members',
  New: 'new',
  Overview: 'overview',
  Preview: 'preview',
  Profile: 'profile',
  Subscription: 'subscription',
} as const;

export type TWorkspaceManagerSection =
  (typeof WorkspaceManagerSectionDict)[keyof typeof WorkspaceManagerSectionDict];

/** Sub-views for the Virtual Lab credits area (workspace manager). */
export const WorkspaceManagerCreditsPanelDict = {
  Buy: 'buy',
  History: 'history',
  Transfer: 'transfer',
} as const;

export type TWorkspaceManagerCreditsPanel =
  (typeof WorkspaceManagerCreditsPanelDict)[keyof typeof WorkspaceManagerCreditsPanelDict];

export function isWorkspaceManagerCreditsPanelKey(
  value: string
): value is TWorkspaceManagerCreditsPanel {
  return (Object.values(WorkspaceManagerCreditsPanelDict) as string[]).includes(value);
}
