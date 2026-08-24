/**
 * Maps a SONATA report's `mapping` group onto the columns of its data matrix.
 *
 * Kept free of h5wasm so it can be tested without instantiating the worker.
 */

/** Node id per column, expanded from the `index_pointers` spans. */
export function expandToColumns(
  nodeIds: number[],
  indexPointers: number[],
  numColumns: number
): number[] {
  const perColumn = new Array<number>(numColumns).fill(nodeIds[0]);

  for (let row = 0; row < nodeIds.length; row += 1) {
    const end = Math.min(indexPointers[row + 1], numColumns);
    for (let column = indexPointers[row]; column < end; column += 1) {
      perColumn[column] = nodeIds[row];
    }
  }
  return perColumn;
}

/** One display label per column; the index is added only when a node id repeats. */
export function buildTraceLabels(columnNodeIds: number[]): string[] {
  if (new Set(columnNodeIds).size === columnNodeIds.length) return columnNodeIds.map(String);

  return columnNodeIds.map((nodeId, index) => `${nodeId}[${index}]`);
}
