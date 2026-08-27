import type {
  MorphoViewerSmallCircuitCell,
  MorphoViewerSmallCircuitCellData,
  MorphoViewerSmallCircuitProps,
} from '@/morpho-viewer';

/**
 * One coloured synapse point cloud — flat `[x, y, z, …]` world coordinates.
 * Derived from the package prop so the contract can't drift from the viewer.
 */
export type TSmallCircuitSynapseGroup = NonNullable<
  MorphoViewerSmallCircuitProps['synapses']
>[number];

/**
 * Normalized data contract for {@link MorphoViewerSmallCircuit}.
 *
 * Shared so the GPU surface does not know where its cells came from: a circuit's nodes are
 * read from its SONATA files in the browser, an MEModel is served by `/memodel/viz`.
 */
export type TSmallCircuitSource = {
  cells: MorphoViewerSmallCircuitCell[];
  loadCell: (cellId: string) => Promise<MorphoViewerSmallCircuitCellData | null>;
  isLoading: boolean;
  /** Anything the source failed at — the node list or a morphology. */
  error: Error | null;
  /** Discard the failure and fetch again. */
  retry: () => void;
  /**
   * Afferent synapses, one group per edge population. Optional: only a single-scale circuit
   * has them, and an MEModel is not stored as a circuit at all.
   */
  synapses?: TSmallCircuitSynapseGroup[];
  /** Per loaded cell (by the id in {@link cells}): SONATA section id → the viewer's section name. */
  sonataSectionIds?: ReadonlyMap<string, ReadonlyMap<number, string>>;
  /**
   * Centre of the population on show, used to place things near it: a new
   * electrode seeds its origin here. Null until that population's nodes are
   * placed. This is not the centre of {@link cells}, which may include context
   * populations that would pull it away from the cells being recorded.
   */
  anchor: [x: number, y: number, z: number] | null;
};
