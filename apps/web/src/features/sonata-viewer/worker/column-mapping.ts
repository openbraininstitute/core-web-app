import type { TraceMeta } from '../types';

/**
 * One {@link TraceMeta} per data-matrix column, or null when the mapping fits neither the
 * spec layout (spans in `index_pointers`) nor the per-column one (`node_ids` per column).
 */
export function resolveTraces(
  nodeIds: number[],
  indexPointers: number[],
  elementIds: number[] | null,
  numColumns: number
): TraceMeta[] | null {
  const columnNodeIds = resolveColumnNodeIds(nodeIds, indexPointers, numColumns);
  if (!columnNodeIds) return null;

  const columnElementIds = elementIds?.length === numColumns ? elementIds : null;

  const columnsPerNode = new Map<number, number>();
  for (const nodeId of columnNodeIds) {
    columnsPerNode.set(nodeId, (columnsPerNode.get(nodeId) ?? 0) + 1);
  }

  const ordinals = new Map<number, number>();
  return columnNodeIds.map((nodeId, column) => {
    const ordinal = ordinals.get(nodeId) ?? 0;
    ordinals.set(nodeId, ordinal + 1);

    return {
      nodeId,
      elementId: columnElementIds ? columnElementIds[column] : null,
      // biome-ignore lint/style/noNonNullAssertion: every nodeId was counted above
      label: columnsPerNode.get(nodeId)! > 1 ? `${nodeId}[${ordinal}]` : `${nodeId}`,
    };
  });
}

/** The node id owning each column, or null when the layout is unrecognised. */
function resolveColumnNodeIds(
  nodeIds: number[],
  indexPointers: number[],
  numColumns: number
): number[] | null {
  if (nodeIds.length === 0 || numColumns <= 0) return null;

  if (isSpecPointers(nodeIds, indexPointers, numColumns)) {
    const perColumn = new Array<number>(numColumns);
    for (let row = 0; row < nodeIds.length; row += 1) {
      for (let column = indexPointers[row]; column < indexPointers[row + 1]; column += 1) {
        perColumn[column] = nodeIds[row];
      }
    }
    return perColumn;
  }

  if (nodeIds.length === numColumns) return nodeIds.slice();

  return null;
}

/** Spans covering exactly [0, numColumns): one pointer per node plus a terminator. */
function isSpecPointers(nodeIds: number[], indexPointers: number[], numColumns: number): boolean {
  if (indexPointers.length !== nodeIds.length + 1) return false;
  if (indexPointers[0] !== 0 || indexPointers[indexPointers.length - 1] !== numColumns) {
    return false;
  }

  for (let i = 1; i < indexPointers.length; i += 1) {
    if (!(indexPointers[i] >= indexPointers[i - 1])) return false;
  }
  return true;
}
