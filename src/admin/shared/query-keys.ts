const PREFIX = 'admin';

export const OPS_SERVICE_HEALTH_KEY_PREFIX = `${PREFIX}-ops-health`;

export const adminQueryKeys = {
  operatorCapabilities: () => [`${PREFIX}-operator-capabilities`] as const,
  opsServiceHealth: ({ key }: { key: string }) => [OPS_SERVICE_HEALTH_KEY_PREFIX, { key }] as const,
  opsServiceVersion: ({ key }: { key: string }) =>
    [OPS_SERVICE_HEALTH_KEY_PREFIX, 'version', { key }] as const,
};
