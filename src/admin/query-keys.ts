const SERVICES = ['admin', 'services'] as const;

export const adminQueryKeys = {
  services: () => SERVICES,
  serviceHealth: (key: string) => [...SERVICES, 'health', key] as const,
  serviceVersion: (key: string) => [...SERVICES, 'version', key] as const,
};
