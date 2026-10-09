import {
  DESCRIPTION_RENDERER,
  DescriptionCell,
} from '@/features/data-grid/bindings/entitycore/renderers/description-cell';
import {
  LIFECYCLE_STATUS_RENDERER,
  LifecycleStatusCell,
} from '@/features/data-grid/bindings/entitycore/renderers/lifecycle-status-cell';
import { registerSharedRenderers } from '@/features/data-grid/bindings/entitycore/renderers/register';
import {
  SCOPE_RENDERER,
  ScopeCell,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import {
  SCOPE_HEADER_RENDERER,
  ScopeHeader,
} from '@/features/data-grid/bindings/entitycore/renderers/scope-header';
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
  registry.register(SCOPE_RENDERER, ScopeCell);
  registry.registerHeader(SCOPE_HEADER_RENDERER, ScopeHeader);
  registerSharedRenderers(registry);
  definition.registerCellRenderers?.(registry);
  return registry;
}

/** One registry per definition, so every grid on it resolves against the same object. */
const REGISTRY_BY_DEFINITION = new WeakMap<TAnyEntityGridDefinition, CellRendererRegistry>();

/**
 * The shared registry for a definition, built on first use. Prefer this in components so
 * a nested grid and its host resolve against one object. Shared and mutable — use
 * {@link buildCellRenderers} for a private registry you intend to add to.
 */
export function getCellRenderers(definition: TAnyEntityGridDefinition): CellRendererRegistry {
  let registry = REGISTRY_BY_DEFINITION.get(definition);
  if (!registry) {
    registry = buildCellRenderers(definition);
    REGISTRY_BY_DEFINITION.set(definition, registry);
  }
  return registry;
}
