'use client';

import { createContext, useContext } from 'react';

import { hasCapability } from '../capabilities/has-capability';

import type { ReactNode } from 'react';
import type { CapabilityPath, OperatorCapabilities } from '../capabilities/types';

const CapabilitiesContext = createContext<OperatorCapabilities | null>(null);

export const CapabilitiesProvider = CapabilitiesContext.Provider;

// Hides what the service would refuse. The service still decides, on every call.
export function CapabilityGate({
  need,
  children,
  fallback = null,
}: {
  need: CapabilityPath;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const capabilities = useContext(CapabilitiesContext);
  return capabilities && hasCapability(capabilities, need) ? children : fallback;
}
