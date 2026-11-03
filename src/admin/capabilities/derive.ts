import { CAPABILITY_REGISTRY } from './registry';

import type { CapabilityPath, OperatorCapabilities } from './types';

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

  const view = Object.values(granted).some((section) => Object.values(section).some(Boolean));

  return { ...granted, ops: { view } };
}

export function hasCapability(caps: OperatorCapabilities, path: CapabilityPath): boolean {
  const [group, leaf] = path.split('.') as [keyof OperatorCapabilities, string];
  const section = caps[group] as Record<string, boolean> | undefined;
  return Boolean(section?.[leaf]);
}
