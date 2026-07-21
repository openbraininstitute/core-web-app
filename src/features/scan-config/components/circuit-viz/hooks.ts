import { useObiOneVizSource } from './sources';

import type { MorphoViewerSmallCircuitCellData } from '@/morpho-viewer';

/**
 * @deprecated Prefer {@link useObiOneVizSource} — kept for call sites that still
 * expect `{ circuit, isLoading, error, loadCell }`.
 */
export function useCircuit(
  circuitId: string,
  showAxon: boolean,
  colorsByNode?: string[],
  defaultColor?: string
) {
  const source = useObiOneVizSource({
    circuitId,
    showAxons: showAxon,
    colorsByNode,
    defaultColor,
  });

  return {
    circuit: source.cells,
    isLoading: source.isLoading,
    error: source.error,
    loadCell: source.loadCell as (
      cellId: string
    ) => Promise<MorphoViewerSmallCircuitCellData | null>,
  };
}
