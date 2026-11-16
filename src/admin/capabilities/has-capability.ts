import get from 'es-toolkit/compat/get';

import type { CapabilityPath, OperatorCapabilities } from './types';

// Kept apart from derive.ts, so client code never imports the group registry.
export function hasCapability(caps: OperatorCapabilities, path: CapabilityPath): boolean {
  return Boolean(get(caps, path));
}
