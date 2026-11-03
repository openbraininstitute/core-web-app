const OPS = ['admin', 'ops'] as const;
const TENANCY = ['admin', 'tenancy'] as const;

export const adminQueryKeys = {
  operatorCapabilities: () => ['admin', 'operator-capabilities'] as const,
  ops: () => OPS,
  opsServiceHealth: ({ key }: { key: string }) => [...OPS, 'health', { key }] as const,
  opsServiceVersion: ({ key }: { key: string }) => [...OPS, 'version', { key }] as const,
  tenancy: () => TENANCY,
  labs: () => [...TENANCY, 'labs'] as const,
  lab: ({ vlabId }: { vlabId: string }) => [...TENANCY, 'lab', vlabId] as const,
  labMembers: ({ vlabId }: { vlabId: string }) => [...TENANCY, 'lab', vlabId, 'members'] as const,
  labInvites: ({ vlabId }: { vlabId: string }) => [...TENANCY, 'lab', vlabId, 'invites'] as const,
  projects: () => [...TENANCY, 'projects'] as const,
  project: ({ projectId }: { projectId: string }) => [...TENANCY, 'project', projectId] as const,
  projectMembers: ({ projectId }: { projectId: string }) =>
    [...TENANCY, 'project', projectId, 'members'] as const,
  users: () => [...TENANCY, 'users'] as const,
  user: ({ userId }: { userId: string }) => [...TENANCY, 'user', userId] as const,
  subscriptions: () => [...TENANCY, 'subscriptions'] as const,
  payments: () => [...TENANCY, 'payments'] as const,
  search: ({ query }: { query: string }) => [...TENANCY, 'search', query] as const,
};
