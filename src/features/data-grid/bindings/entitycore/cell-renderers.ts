import { CellRendererRegistry } from '../../react';
import { LIFECYCLE_STATUS_RENDERER, LifecycleStatusCell } from './renderers/lifecycle-status-cell';

import type { TAnyEntityGridDefinition } from './registry';

/**
 * Build a cell-renderer registry populated with a definition's renderers.
 *
 * Lives OUTSIDE `registry.ts` on purpose: the registry statically imports every
 * entity schema (including the circuit plugin, whose body imports the shared host),
 * so if the host imported `buildCellRenderers` from the registry it would form a
 * module-init cycle. The host imports it from here instead; only a type import ties
 * this file to the registry, which is erased at runtime.
 *
 * The LIFECYCLE-STATUS pill is registered UNCONDITIONALLY, before the definition's own
 * hook. `lifecycleStatusColumn` is on every listing, but only some definitions declare
 * a `registerCellRenderers` at all (the circuit-family and simulation definitions do
 * not), and a column whose renderer key is unregistered falls back to plain text.
 * Registering it here is what makes one shared pill hold across every entity without
 * 20 identical opt-ins. A definition may still override the key afterwards.
 */
export function buildCellRenderers(definition: TAnyEntityGridDefinition): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  registry.register(LIFECYCLE_STATUS_RENDERER, LifecycleStatusCell);
  definition.registerCellRenderers?.(registry);
  return registry;
}
