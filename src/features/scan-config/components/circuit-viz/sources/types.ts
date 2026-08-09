import type {
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
  MorphoViewerSmallCircuitProps,
} from '@/morpho-viewer';

/**
 * One coloured synapse point cloud — flat `[x, y, z, …]` world coordinates.
 * Derived from the package prop so the contract can't drift from the viewer.
 */
export type SmallCircuitSynapseGroup = NonNullable<
  MorphoViewerSmallCircuitProps['synapses']
>[number];

/**
 * Normalized data contract for {@link MorphoViewerSmallCircuit}.
 *
 * Shared so the GPU surface does not know where its cells came from: a circuit is served by
 * OBI-One `/circuit/viz`, an MEModel by `/memodel/viz`.
 */
export type SmallCircuitSource = {
  cells: MorphoViewerSmallCircuitCell[];
  loadCell: (cellId: string) => Promise<MorphoViewerSmallCircuitCellData | null>;
  isLoading: boolean;
  error: Error | null;
  /**
   * Afferent synapses, one group per edge population. Optional: only a single-scale circuit
   * has them, and an MEModel is not stored as a circuit at all.
   */
  synapses?: SmallCircuitSynapseGroup[];
};
