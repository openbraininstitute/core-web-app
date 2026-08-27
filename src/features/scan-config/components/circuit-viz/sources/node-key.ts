/**
 * The id morphoviewer knows a cell by, and how to get the node back out of it.
 *
 * There are two ids, answering different questions. {@link makeNodeKey} names
 * the node itself, by population and index, since every population counts its
 * nodes from 0; it is what the synapse projection and error logs cite.
 * {@link makeVizCellId} adds a reload key, so a change in what `loadCell` would
 * answer yields new ids and the viewer re-requests each cell's geometry instead
 * of repainting the cached tree.
 */
export function makeNodeKey(circuitId: string, population: string, index: number): string {
  return `${circuitId}/${population} #${index}`;
}

type TVizCellOptions = {
  showAxons: boolean;
  /**
   * The node is drawn as a soma only: its population is on screen for
   * context rather than on show. Part of the key because selecting that
   * population must turn its somas into morphologies, and the viewer only
   * re-requests cells whose id changed.
   */
  somaOnly?: boolean;
};

/**
 * The id the viewer addresses a cell by; the query part is its reload key.
 *
 * Worth knowing when reading it back: morphoviewer splits the id on `?` and
 * calls `loadCell` with the path part alone, so a handler is handed the node
 * key rather than the id the viewer is holding. Anything indexed against what
 * the viewer knows — `sonataSectionIds`, say — has to be re-keyed through this.
 */
export function makeVizCellId(nodeKey: string, { showAxons, somaOnly = false }: TVizCellOptions) {
  return `${nodeKey}?axons=${showAxons}${somaOnly ? '&soma-only' : ''}`;
}

/**
 * Recover the node from an id either function produced, or null for anything
 * else.
 *
 * Matched with a regex rather than split: `Number('')` is 0, so an id without
 * an index would resolve to node 0 and load the wrong cell's morphology. The
 * population is everything between the circuit id and the trailing ` #index`,
 * which is unambiguous because a SONATA population is an HDF5 group and its
 * name cannot contain `/`.
 */
export function parseNodeKey(cellId: string): { population: string; index: number } | null {
  const match = /^[^/]+\/(.+) #(\d+)(?:\?|$)/.exec(cellId);
  return match ? { population: match[1], index: Number(match[2]) } : null;
}
