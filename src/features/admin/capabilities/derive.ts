import { mapValues } from 'es-toolkit';

import { CAPABILITY_REGISTRY } from './registry';

import type { GrantedCapabilities, OperatorCapabilities } from './types';

export function deriveCapabilities(groups: string[]): OperatorCapabilities {
  const held = new Set(groups);
  const granted = mapValues(CAPABILITY_REGISTRY, (section) =>
    mapValues(section, (required: readonly string[]) => required.some((group) => held.has(group)))
  ) as GrantedCapabilities;

  const access = Object.values(granted).some((section) => Object.values(section).some(Boolean));

  return { ...granted, admin: { access } };
}
