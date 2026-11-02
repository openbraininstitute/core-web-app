import type { DownloadProgress } from '@/features/circuit-nodes/types';
import type { CellColors, SynapseGroup } from '@/features/circuit-viewer/morphologies/types';
import type { TreeSource } from '@/features/circuit-viewer/morphologies/use-tree-morphologies';

/** One coloured group of synapses, and what the legend calls it. */
export type TSmallCircuitSynapseGroup = SynapseGroup & { label: string };

/**
 * What the small-circuit view draws, wherever its cells come from: a circuit's nodes are read from its SONATA files in
 * the browser, an MEModel is one cell at the origin.
 */
export type TSmallCircuitSource = {
  /** The cells, and where each one's morphology is read; null until there are cells to draw. Another is another scene. */
  tree: TreeSource | null;
  /**
   * Each cell's colour: the population on show by colour-by, or a lone cell by its sections' types; the rest receded;
   * the hidden populations not drawn.
   */
  cellColors: CellColors;
  /** The populations taken out of the scene, whose morphologies are not read while they are. */
  hidden: readonly string[];
  /**
   * The cells a stored morphology location applies to: those of the population on show that have a morphology. A
   * location is a section id and an offset with no cell of its own, so it can only be read against one population's
   * morphologies.
   */
  locationCells: readonly number[];
  /** Node-file bytes still coming, so the viewer can say what it is waiting for. An MEModel reads no node files. */
  download?: DownloadProgress | null;
  /** What the source failed at: the circuit's config or the placement of every population. */
  error: Error | null;
  /** Afferent synapses, one group per edge population; only a single-cell circuit has them. */
  synapses?: TSmallCircuitSynapseGroup[];
  /**
   * Centre of the population on show, used to place things near it: a new electrode seeds its origin here. Null until
   * that population's nodes are placed.
   */
  anchor: [x: number, y: number, z: number] | null;
  /** Whether a hover may light cells: not beside a cell pointed out alone. Always where absent. */
  hover?: boolean;
};
