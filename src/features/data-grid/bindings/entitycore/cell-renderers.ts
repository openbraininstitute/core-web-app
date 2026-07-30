import { CellRendererRegistry } from '../../react';

import type { AnyEntityGridDefinition } from './registry';

/**
 * Build a cell-renderer registry populated with a definition's renderers.
 *
 * Lives OUTSIDE `registry.ts` on purpose: the registry statically imports every
 * entity schema (including the circuit plugin, whose body imports the shared host),
 * so if the host imported `buildCellRenderers` from the registry it would form a
 * module-init cycle. The host imports it from here instead; only a type import ties
 * this file to the registry, which is erased at runtime.
 */
export function buildCellRenderers(definition: AnyEntityGridDefinition): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  definition.registerCellRenderers?.(registry);
  return registry;
}
