const OPS = ['admin', 'ops'] as const;

export const adminQueryKeys = {
  operatorCapabilities: () => ['admin', 'operator-capabilities'] as const,
  ops: () => OPS,
  opsServiceHealth: ({ key }: { key: string }) => [...OPS, 'health', { key }] as const,
  opsServiceVersion: ({ key }: { key: string }) => [...OPS, 'version', { key }] as const,
};
