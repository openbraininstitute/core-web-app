import { CONTRIBUTORS_RENDERER, ContributorsCell } from './contributors-cell';
import { ENTITY_PREVIEW_RENDERER, EntityPreview } from './entity-preview';

import type { CellRendererRegistry } from '../../../react';

/**
 * Register the cell renderers shared by most entitycore listings — the preview
 * thumbnail and the contributors cell. Entities that need a bespoke preview
 * (e.g. cell-morphology) call this then override the preview key.
 */
export function registerSharedRenderers(registry: CellRendererRegistry): void {
  registry.register(ENTITY_PREVIEW_RENDERER, EntityPreview);
  registry.register(CONTRIBUTORS_RENDERER, ContributorsCell);
}
