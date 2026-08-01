'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { createServiceManager, type JupyterTarget } from './connection';

import type { ServiceManager } from '@jupyterlab/services';
import type { ReactNode } from 'react';

interface JupyterContextValue {
  services: ServiceManager.IManager;
  target: JupyterTarget;
}

const JupyterContext = createContext<JupyterContextValue | null>(null);

/**
 * Owns one ServiceManager per pod. Unlike a module-level singleton this lets a user
 * hold connections to different pods, and disposes sockets when the page unmounts.
 */
export function JupyterProvider({
  target,
  children,
}: {
  target: JupyterTarget;
  children: ReactNode;
}) {
  const [services, setServices] = useState<ServiceManager.IManager | null>(null);

  useEffect(() => {
    const manager = createServiceManager(target);
    setServices(manager);
    return () => {
      manager.dispose();
      setServices(null);
    };
  }, [target]);

  const value = useMemo(() => (services ? { services, target } : null), [services, target]);

  if (!value) return null;
  return <JupyterContext.Provider value={value}>{children}</JupyterContext.Provider>;
}

export function useJupyter(): JupyterContextValue {
  const value = useContext(JupyterContext);
  if (!value) {
    throw new Error('useJupyter must be used inside a JupyterProvider');
  }
  return value;
}

export function useServices(): ServiceManager.IManager {
  return useJupyter().services;
}
