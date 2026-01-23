'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { ClientConfig } from '@/config/schema';

const ConfigContext = createContext<ClientConfig | null>(null);

interface ConfigProviderProps {
  config: ClientConfig;
  children: ReactNode;
}

export function ConfigProvider({ config, children }: ConfigProviderProps) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ClientConfig {
  const config = useContext(ConfigContext);
  if (!config) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return config;
}
