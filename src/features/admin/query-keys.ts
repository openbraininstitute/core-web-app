const SERVICES = ['admin', 'services'] as const;

export const adminQueryKeys = {
  services: () => SERVICES,
  serviceHealth: ({ key }: { key: string }) => [...SERVICES, 'health', { key }] as const,
  serviceVersion: ({ key }: { key: string }) => [...SERVICES, 'version', { key }] as const,
};
