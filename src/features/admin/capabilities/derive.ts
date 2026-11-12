import { CAPABILITY_REGISTRY } from './registry';

import type { OperatorCapabilities } from './types';

export function deriveCapabilities(groups: string[]): OperatorCapabilities {
  const held = new Set(groups);
  const grants = (required: readonly string[]) => required.some((group) => held.has(group));
  const { entitycore, virtualLab, promotions, accounting, simulator, launchSystem } =
    CAPABILITY_REGISTRY;

  const granted = {
    entitycore: { admin: grants(entitycore.admin), assetWrite: grants(entitycore.assetWrite) },
    virtualLab: { read: grants(virtualLab.read), admin: grants(virtualLab.admin) },
    promotions: { admin: grants(promotions.admin) },
    accounting: { admin: grants(accounting.admin) },
    simulator: { admin: grants(simulator.admin) },
    launchSystem: { admin: grants(launchSystem.admin) },
  };

  const access = Object.values(granted).some((section) => Object.values(section).some(Boolean));

  return { ...granted, admin: { access } };
}
