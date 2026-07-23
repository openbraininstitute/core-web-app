import { useCallback, useMemo } from 'react';

import { DEFAULT_NEURON_COLOR } from '@/features/scan-config/components/color-by/palette';
import { CircuitLoader } from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { SmallCircuitSource } from './types';

type Options = {
  circuit: ICircuit;
  colorsByNode?: string[];
  defaultColor?: string;
};

/**
 * Single-scale source: client-side SONATA asset → SWC trees.
 *
 * Why not OBI-One viz: backend only allows `pair` | `small`. Singles must load
 * from the entity `sonata_circuit` directory (same path as production ViewerLayout).
 */
export function useSonataAssetSource({
  circuit,
  colorsByNode,
  defaultColor = DEFAULT_NEURON_COLOR,
}: Options): SmallCircuitSource {
  const { virtualLabId, projectId } = useWorkspace();

  const loader = useMemo(
    () => new CircuitLoader(circuit, virtualLabId, projectId),
    [circuit, virtualLabId, projectId]
  );

  const loaded = loader.useLoaded();
  const hasError = loader.useError();

  const cells: MorphoViewerSmallCircuitCell[] = useMemo(() => {
    if (!loaded) return [];
    // Preserve section colour palette until color-by supplies flat per-node colours.
    if (!colorsByNode) return loader.circuit;
    return loader.circuit.map((cell, i) => ({
      ...cell,
      color: colorsByNode[i] ?? defaultColor,
    }));
  }, [loaded, loader, colorsByNode, defaultColor]);

  const loadCell = useCallback((cellId: string) => loader.loadCell(cellId), [loader]);

  const error = useMemo(() => {
    if (!hasError) return null;
    const failure = loader.report.tasks.find((t) => t.failure);
    return new Error(failure?.message ?? 'Failed to load SONATA circuit');
  }, [hasError, loader.report.tasks]);

  return {
    cells,
    loadCell,
    isLoading: !loaded && !hasError,
    error,
  };
}
