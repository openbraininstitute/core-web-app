import {
  DESCRIPTION_RENDERER,
  DescriptionCell,
} from '@/features/data-grid/bindings/entitycore/renderers/description-cell';
import {
  LIFECYCLE_STATUS_RENDERER,
  LifecycleStatusCell,
} from '@/features/data-grid/bindings/entitycore/renderers/lifecycle-status-cell';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import { CellRendererRegistry } from '@/features/data-grid/react';

import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';

/**
 * Build a cell-renderer registry populated with a definition's renderers.
 *
 * Must stay OUT of `registry.ts`: that module statically imports every entity schema
 * (and the circuit plugin imports the host), so the host importing this from there
 * forms a module-init cycle. Only the erased type import ties this file to the registry.
 */
export function buildCellRenderers(definition: TAnyEntityGridDefinition): CellRendererRegistry {
  const registry = new CellRendererRegistry();
  registry.register(LIFECYCLE_STATUS_RENDERER, LifecycleStatusCell);
  registry.register(DESCRIPTION_RENDERER, DescriptionCell);
  // The shared column catalog emits the preview and contributors keys, so any schema
  // built from it references them; registering here keeps that from depending on the
  // author remembering an opt-in line. A definition's own registrations run last and
  // still win.
  registerSharedRenderers(registry);
  definition.registerCellRenderers?.(registry);
  return registry;
}
