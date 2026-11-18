const SERVICES = ['admin', 'services'] as const;
const TENANCY = ['admin', 'tenancy'] as const;
const BILLING = ['admin', 'billing'] as const;
const PROMOTIONS = [...BILLING, 'promotions'] as const;

export const adminQueryKeys = {
  services: () => SERVICES,
  serviceHealth: (key: string) => [...SERVICES, 'health', key] as const,
  serviceVersion: (key: string) => [...SERVICES, 'version', key] as const,
  tenancy: () => TENANCY,
  labs: () => [...TENANCY, 'labs'] as const,
  lab: (vlabId: string) => [...TENANCY, 'lab', vlabId] as const,
  labMembers: (vlabId: string) => [...TENANCY, 'lab', vlabId, 'members'] as const,
  labInvites: (vlabId: string) => [...TENANCY, 'lab', vlabId, 'invites'] as const,
  projects: () => [...TENANCY, 'projects'] as const,
  project: (projectId: string) => [...TENANCY, 'project', projectId] as const,
  projectMembers: (projectId: string) => [...TENANCY, 'project', projectId, 'members'] as const,
  users: () => [...TENANCY, 'users'] as const,
  user: (userId: string) => [...TENANCY, 'user', userId] as const,
  subscriptions: () => [...TENANCY, 'subscriptions'] as const,
  payments: () => [...TENANCY, 'payments'] as const,
  search: (query: string) => [...TENANCY, 'search', query] as const,
  courses: (query: string) => [...TENANCY, 'courses', query] as const,
  course: (courseId: string) => [...TENANCY, 'course', courseId] as const,
  courseBatches: (courseId: string) => [...TENANCY, 'course', courseId, 'batches'] as const,
  institutions: (query: string) => [...TENANCY, 'institutions', query] as const,
  billing: () => BILLING,
  plans: () => [...BILLING, 'plans'] as const,
  creditRates: () => [...BILLING, 'credit-rates'] as const,
  promotions: () => PROMOTIONS,
  promotionList: () => [...PROMOTIONS, 'list'] as const,
  promotionAnalytics: () => [...PROMOTIONS, 'analytics'] as const,
  promotion: (promotionId: string) => [...PROMOTIONS, 'code', promotionId] as const,
  // Outside `promotions()`: no promotion write changes the redemptions.
  promotionUsage: (promotionId: string) => [...BILLING, 'promotion-usage', promotionId] as const,
};
