import { useMemo } from 'react';

import { memodelMorphologyPath } from '@/api/one/circuit-visualization';
import { PLACEHOLDER_SOMA_RADIUS } from '@/features/scan-config/components/circuit-viz/sources/use-small-circuit-source';
import { SECTION_TYPE_COLORS } from '@/features/scan-config/components/color-by/palette';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { CellColors } from '@/features/circuit-viewer/morphologies/types';
import type { TreeSource } from '@/features/circuit-viewer/morphologies/use-tree-morphologies';
import type { TSmallCircuitSource } from '@/features/scan-config/components/circuit-viz/sources/types';

/** An MEModel is one neuron, in its sections' colours. */
const BY_SECTION: CellColors = { palette: [SECTION_TYPE_COLORS], columnByCell: Uint16Array.of(0) };
const NOTHING_HIDDEN: readonly string[] = [];
const THE_CELL = [0];
const ORIGIN: [number, number, number] = [0, 0, 0];

/**
 * Viewer source for one MEModel: a cell at the origin, unturned, whose morphology OBI-One serves at
 * `/memodel/viz/{id}/morphology`. Its sections carry `sonata_section_id`, so morphology locations can be picked here
 * too.
 */
export function useMemodelVisualizationSource({
  memodelId,
}: {
  memodelId: string;
}): TSmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();
  const tree = useMemo(
    (): TreeSource => ({
      somas: { positions: Float32Array.of(0, 0, 0), populations: [{ name: 'memodel', cells: 1 }] },
      orientations: null,
      placeholderRadius: PLACEHOLDER_SOMA_RADIUS,
      requests: [{ path: memodelMorphologyPath(memodelId), virtualLabId, projectId }],
    }),
    [memodelId, virtualLabId, projectId]
  );
  return {
    tree,
    cellColors: BY_SECTION,
    hidden: NOTHING_HIDDEN,
    locationCells: THE_CELL,
    isLoading: false,
    error: null,
    anchor: ORIGIN,
  };
}
