/**
 * The id morphoviewer knows a cell by, and how to get its node index back.
 *
 * Two ids, because they answer different questions. {@link makeNodeKey} names
 * the node itself and is what the synapse projection and error logs cite;
 * {@link makeVizCellId} adds the axon flag, so toggling axons yields new ids
 * and the viewer re-requests each cell's geometry instead of repainting the
 * cached tree.
 */
export function makeNodeKey(circuitId: string, index: number): string {
  return `${circuitId} #${index}`;
}

/** The id the viewer addresses a cell by; the query part is its axon-toggle reload key. */
export function makeVizCellId(nodeKey: string, showAxons: boolean): string {
  return `${nodeKey}?axons=${showAxons}`;
}

/**
 * Recover the node index from an id either function produced, or null for
 * anything else.
 *
 * Matched rather than parsed from the last `#`: `Number('')` is 0, so an id
 * without an index would otherwise resolve to node 0 and quietly load the
 * wrong cell's morphology.
 */
export function indexOfNodeKey(cellId: string): number | null {
  const match = /#(\d+)(?:\?|$)/.exec(cellId);
  return match ? Number(match[1]) : null;
}
