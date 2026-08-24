import { describe, expect, it } from 'vitest';

import { buildTraceLabels, expandToColumns } from './column-mapping';

/** `mapping` of a soma report: one unique node per column, as the SONATA spec describes. */
function somaReport(nodeCount: number) {
  return {
    nodeIds: Array.from({ length: nodeCount }, (_, i) => i),
    indexPointers: Array.from({ length: nodeCount + 1 }, (_, i) => i),
    numColumns: nodeCount,
  };
}

/** Column node ids plus their labels, the pair the viewer actually renders from. */
function traces(nodeIds: number[], indexPointers: number[], numColumns: number) {
  const columnNodeIds = expandToColumns(nodeIds, indexPointers, numColumns);
  return { columnNodeIds, labels: buildTraceLabels(columnNodeIds) };
}

describe('expandToColumns', () => {
  it('gives every soma-report node its own column', () => {
    const { nodeIds, indexPointers, numColumns } = somaReport(4);

    expect(expandToColumns(nodeIds, indexPointers, numColumns)).toEqual([0, 1, 2, 3]);
  });

  it('spreads one node across the whole span it owns', () => {
    // The spec-compliant compartment report: one cell recorded at 20 compartments.
    expect(expandToColumns([0], [0, 20], 20)).toEqual(Array.from({ length: 20 }, () => 0));
  });

  it('handles node_ids written once per column instead of once per node', () => {
    // The non-conformant writer: 20 rows that all read 0, one column each.
    const nodeIds = Array.from({ length: 20 }, () => 0);
    const indexPointers = Array.from({ length: 21 }, (_, i) => i);

    expect(expandToColumns(nodeIds, indexPointers, 20)).toEqual(nodeIds);
  });

  it('interleaves several cells that each span several compartments', () => {
    expect(expandToColumns([7, 9], [0, 3, 6], 6)).toEqual([7, 7, 7, 9, 9, 9]);
  });

  it('never returns more entries than the data matrix has columns', () => {
    // A pointer past the end must not stretch the array; the grid renders one cell per entry.
    expect(expandToColumns([0, 1], [0, 2, 99], 3)).toHaveLength(3);
  });

  it('clamps a span that overruns the matrix', () => {
    expect(expandToColumns([0, 1], [0, 2, 99], 3)).toEqual([0, 0, 1]);
  });
});

describe('buildTraceLabels', () => {
  it('labels a soma report by node id alone', () => {
    expect(buildTraceLabels([0, 1, 2, 3])).toEqual(['0', '1', '2', '3']);
  });

  it('adds the index only once a node id repeats', () => {
    expect(buildTraceLabels([0, 0, 0])).toEqual(['0[0]', '0[1]', '0[2]']);
  });

  it('leaves a single recorded trace unqualified', () => {
    expect(buildTraceLabels([0])).toEqual(['0']);
  });

  it('qualifies every label once any node id repeats, so none read alike', () => {
    const labels = buildTraceLabels([0, 0, 1]);

    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('report layouts', () => {
  it('renders one distinguishable trace per column, whatever the layout', () => {
    const layouts = {
      'soma, 20 cells': somaReport(20),
      'compartment, 1 cell x 20': { nodeIds: [0], indexPointers: [0, 20], numColumns: 20 },
      'node_ids repeated per column': {
        nodeIds: Array.from({ length: 20 }, () => 0),
        indexPointers: Array.from({ length: 21 }, (_, i) => i),
        numColumns: 20,
      },
      '4 cells x 5 compartments': {
        nodeIds: [0, 1, 2, 3],
        indexPointers: [0, 5, 10, 15, 20],
        numColumns: 20,
      },
    };

    for (const [name, m] of Object.entries(layouts)) {
      const { labels } = traces(m.nodeIds, m.indexPointers, m.numColumns);

      // one plot per column, and no two plots carrying the same name
      expect(labels, name).toHaveLength(20);
      expect(new Set(labels).size, name).toBe(20);
    }
  });

  it('keeps soma-report labels free of an index suffix', () => {
    const { nodeIds, indexPointers, numColumns } = somaReport(20);

    const { labels } = traces(nodeIds, indexPointers, numColumns);

    expect(labels).toEqual(Array.from({ length: 20 }, (_, i) => String(i)));
  });

  it('counts distinct cells, not traces', () => {
    // The overview header says "N nodes"; 20 compartments of one cell is still one node.
    const { columnNodeIds } = traces([0], [0, 20], 20);

    expect(new Set(columnNodeIds).size).toBe(1);
  });
});
