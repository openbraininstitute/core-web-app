import { useMemo } from 'react';

import { categoricalColor } from '@/features/scan-config/components/color-by/palette';
import { CircuitLoader } from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader';
import useWorkspace from '@/ui/hooks/use-workspace';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { SmallCircuitSynapseGroup } from './types';

/**
 * Afferent synapses for a circuit, positioned against the surface the viewer draws.
 *
 * Read client-side rather than from OBI-One's `/circuit/viz/{id}/synapses`, which returns the
 * edge file's raw coordinates. Those are not directly drawable: SONATA computes a somatic
 * synapse against a *spherical* soma while a morphology describes the soma as a cylinder stack,
 * so raw somatic coordinates sink inside or float outside the rendered mesh. This loader
 * rebuilds the drawn surface and projects them onto it — the correction added in #1845.
 *
 * The morphology itself still comes from OBI-One, which is the only source that numbers
 * sections the way the simulation does. The cost is that the SONATA asset is read twice; the
 * way out is to project in the viewer, against the geometry it already has, rather than to
 * hand back raw positions.
 *
 * @param circuit - The circuit whose afferent synapses to load.
 * @returns One group per edge population. Empty until the asset has loaded, and for circuits
 * that record connectivity without geometry.
 */
export function useSonataSynapses(circuit: ICircuit): SmallCircuitSynapseGroup[] {
  const { virtualLabId, projectId } = useWorkspace();

  const loader = useMemo(
    () => new CircuitLoader(circuit, virtualLabId, projectId),
    [circuit, virtualLabId, projectId]
  );
  const loaded = loader.useLoaded();

  // Offset so the first population avoids slot 0, the blue the neuron itself wears.
  return useMemo(() => {
    if (!loaded) return [];
    return loader.synapses.map(({ coordinates }, index) => ({
      color: categoricalColor(index + 2),
      coordinates,
    }));
  }, [loaded, loader]);
}
