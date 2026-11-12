const OPS = ['admin', 'ops'] as const;

export const adminQueryKeys = {
  ops: () => OPS,
  opsServiceHealth: ({ key }: { key: string }) => [...OPS, 'health', { key }] as const,
  opsServiceVersion: ({ key }: { key: string }) => [...OPS, 'version', { key }] as const,
};
