import { CONTRIBUTORS_RENDERER, ContributorsCell } from './contributors-cell';
import { EM_DATASET_RENDERER, EmDatasetCell } from './em-dataset-cell';
import { ENTITY_PREVIEW_RENDERER, EntityPreview } from './entity-preview';

import type { CellRendererRegistry } from '@/features/data-grid/react';

/**
 * Register the renderers a schema can name without registering them itself. Entities
 * needing a bespoke preview call this, then override the preview key.
 */
export function registerSharedRenderers(registry: CellRendererRegistry): void {
  registry.register(ENTITY_PREVIEW_RENDERER, EntityPreview);
  registry.register(CONTRIBUTORS_RENDERER, ContributorsCell);
  registry.register(EM_DATASET_RENDERER, EmDatasetCell);
}
