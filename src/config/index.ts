export { clientConfig as config, getClientEnvInjectionConfig } from '@/config/client';
export { ConfigProvider, useConfig } from '@/config/context';

export type { ClientConfig, ServerConfig } from '@/config/schema';

export const isServer = typeof window === 'undefined';
