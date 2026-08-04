import { CONTRIBUTORS_RENDERER, ContributorsCell } from './contributors-cell';
import { ENTITY_PREVIEW_RENDERER, EntityPreview } from './entity-preview';

import type { CellRendererRegistry } from '../../../react';

/**
 * Register the preview-thumbnail and contributors renderers shared by most listings.
 * Entities needing a bespoke preview call this, then override the preview key.
 */
export function registerSharedRenderers(registry: CellRendererRegistry): void {
  registry.register(ENTITY_PREVIEW_RENDERER, EntityPreview);
  registry.register(CONTRIBUTORS_RENDERER, ContributorsCell);
}
