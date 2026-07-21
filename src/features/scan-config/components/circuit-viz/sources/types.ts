import type {
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
} from '@/morpho-viewer';

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
};

/** Strategies that can satisfy {@link SmallCircuitSource}. */
export const SmallCircuitLoaderKind = {
  ObiOneVisualization: 'obi-one-viz',
  SonataAsset: 'sonata-asset',
} as const;

export type TSmallCircuitLoaderKind =
  (typeof SmallCircuitLoaderKind)[keyof typeof SmallCircuitLoaderKind];
