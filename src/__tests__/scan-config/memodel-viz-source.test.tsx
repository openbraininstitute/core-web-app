import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMemodelVisualizationSource } from '@/features/scan-config/components/circuit-viz/sources/use-memodel-viz-source';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';

vi.mock('@/ui/hooks/use-workspace', () => {
  const useWorkspace = () => ({ virtualLabId: 'lab', projectId: 'project' });
  return { useWorkspace, default: useWorkspace };
});

describe('useMemodelVisualizationSource', () => {
  it('is one cell at the origin, read where OBI-One serves the ME-model, in its sections’ colours', () => {
    const { result, rerender } = renderHook(() =>
      useMemodelVisualizationSource({ memodelId: 'me-1' })
    );
    const { tree, cellColors, locationCells, anchor, isLoading, error } = result.current;

    expect(Array.from(tree?.somas.positions ?? [])).toEqual([0, 0, 0]);
    expect(tree?.somas.populations).toEqual([{ name: 'memodel', cells: 1 }]);
    expect(tree?.orientations).toBeNull();
    expect(tree?.requests).toEqual([
      { path: '/memodel/viz/me-1/morphology', virtualLabId: 'lab', projectId: 'project' },
    ]);
    // Its dendrogram is charted beside it, for the preview to morph into.
    expect(tree?.charts).toBe(true);
    expect(cellColors.palette).toEqual([SECTION_TYPE_COLORS]);
    expect(locationCells).toEqual([0]);
    expect([anchor, isLoading, error]).toEqual([[0, 0, 0], false, null]);

    // The same scene, render after render: another would be read again.
    rerender();
    expect(result.current.tree).toBe(tree);
    expect(result.current.anchor).toBe(anchor);
  });
});
