import {
  LIFECYCLE_STATUS_RENDERER,
  LifecycleStatusCell,
} from '@/features/data-grid/bindings/entitycore/renderers/lifecycle-status-cell';
import { CellRendererRegistry } from '@/features/data-grid/react';

import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';

/**
 * Build a cell-renderer registry populated with a definition's renderers.
 *
 * Must stay OUT of `registry.ts`: that module statically imports every entity schema
 * (and the circuit plugin imports the host), so the host importing this from there
 * forms a module-init cycle. Only the erased type import ties this file to the registry.
 *
 * The lifecycle-status pill is registered unconditionally so every listing gets it —
 * many definitions declare no `registerCellRenderers`, and an unregistered key falls
 * back to plain text. A definition may still override the key afterwards.
 */
export function buildCellRenderers(definition: TAnyEntityGridDefinition): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  registry.register(LIFECYCLE_STATUS_RENDERER, LifecycleStatusCell);
  definition.registerCellRenderers?.(registry);
  return registry;
}
