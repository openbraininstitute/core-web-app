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
 * Why a shared type: pair/small load via OBI-One `/circuit/viz`, singles load
 * via the client SONATA asset. The GPU surface must not know which.
 */
export type SmallCircuitSource = {
  cells: MorphoViewerSmallCircuitCell[];
  loadCell: (cellId: string) => Promise<MorphoViewerSmallCircuitCellData | null>;
  isLoading: boolean;
  error: Error | null;
  /**
   * Afferent synapses, one group per edge population. Optional: only the SONATA
   * source reads edge files — OBI-One `/circuit/viz` returns nodes only.
   */
  synapses?: SmallCircuitSynapseGroup[];
};

/** Strategies that can satisfy {@link SmallCircuitSource}. */
export const SmallCircuitLoaderKind = {
  ObiOneVisualization: 'obi-one-viz',
  SonataAsset: 'sonata-asset',
} as const;

export type TSmallCircuitLoaderKind =
  (typeof SmallCircuitLoaderKind)[keyof typeof SmallCircuitLoaderKind];
