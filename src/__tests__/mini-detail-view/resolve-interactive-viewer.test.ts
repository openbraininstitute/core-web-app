import { describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveInteractiveViewer } from '@/ui/segments/mini-detail-view/interactive-viewers';

vi.mock('@/features/entities/em-cell-mesh/preview-viewer', () => ({
  EmCellMeshPreviewViewer: () => null,
}));

describe('resolveInteractiveViewer', () => {
  it('has a viewer for EM cell meshes', () => {
    expect(resolveInteractiveViewer(ExtendedEntitiesTypeDict.EMCellMesh)).not.toBeNull();
  });

  it('has none for other types', () => {
    expect(resolveInteractiveViewer(ExtendedEntitiesTypeDict.CellMorphology)).toBeNull();
    expect(resolveInteractiveViewer(ExtendedEntitiesTypeDict.Circuit)).toBeNull();
    expect(resolveInteractiveViewer(undefined)).toBeNull();
  });
});
