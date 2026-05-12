export const WorkspaceManagerKindDict = {
  Account: 'account',
  Project: 'project',
  VirtualLab: 'virtual-lab',
} as const;

export type TWorkspaceManagerKind =
  (typeof WorkspaceManagerKindDict)[keyof typeof WorkspaceManagerKindDict];

export const WorkspaceManagerSectionDict = {
  Credits: 'credits',
  Invoices: 'invoices',
  History: 'history',
  Members: 'members',
  New: 'new',
  Overview: 'overview',
  Preview: 'preview',
  Profile: 'profile',
  Subscription: 'subscription',
} as const;

export type TWorkspaceManagerSection =
  (typeof WorkspaceManagerSectionDict)[keyof typeof WorkspaceManagerSectionDict];
