import { useCallback, useMemo } from 'react';

import {
  categoricalColor,
  DEFAULT_NEURON_COLOR,
} from '@/features/scan-config/components/color-by/palette';
import { CircuitLoader } from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { MorphoViewerSmallCircuitCell } from '@/morpho-viewer';
import type { SmallCircuitSource, SmallCircuitSynapseGroup } from './types';

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

  // One colour per edge population, from the colourblind-safe categorical set.
  // Offset so the first population lands on bluish green: slot 0 is the blue
  // that DEFAULT_NEURON_COLOR and the first colour-by category both already
  // use, and synapses sit directly on the morphology wearing it.
  //
  // The offset is temporary: it moves the clash rather than removing it, since
  // slot 2 is also the third colour-by category. Synapses need a palette of
  // their own, split from the node one, once the colour requirements are
  // formalized.
  const synapses: SmallCircuitSynapseGroup[] = useMemo(() => {
    if (!loaded) return [];
    return loader.synapses.map(({ coordinates }, index) => ({
      color: categoricalColor(index + 2),
      coordinates,
    }));
  }, [loaded, loader]);

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
    synapses,
  };
}
