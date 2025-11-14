export { clientConfig as config, getClientEnvInjectionConfig } from './client';
export { ConfigProvider, useConfig } from './context';
export type { ServerConfig, ClientConfig } from './schema';

export const isServer = typeof window === 'undefined';
