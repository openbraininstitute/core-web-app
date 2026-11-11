import { describe, expect, it } from 'vitest';

import { resolveTraces } from './column-mapping';

/** `mapping` of a soma report: one unique node per column, as the SONATA spec describes. */
function somaReport(nodeCount: number) {
  return {
    nodeIds: Array.from({ length: nodeCount }, (_, i) => i),
    indexPointers: Array.from({ length: nodeCount + 1 }, (_, i) => i),
  };
}

const nodeIdsOf = (traces: { nodeId: number }[]) => traces.map((t) => t.nodeId);
const labelsOf = (traces: { label: string }[]) => traces.map((t) => t.label);

describe('resolveTraces: layout detection', () => {
  it('maps a spec soma report one node per column', () => {
    const { nodeIds, indexPointers } = somaReport(4);

    const traces = resolveTraces(nodeIds, indexPointers, null, 4);

    expect(traces && nodeIdsOf(traces)).toEqual([0, 1, 2, 3]);
    expect(traces && labelsOf(traces)).toEqual(['0', '1', '2', '3']);
  });

  it('spreads a spec compartment report across the cell span', () => {
    const traces = resolveTraces([0], [0, 20], null, 20);

    expect(traces && nodeIdsOf(traces)).toEqual(Array.from({ length: 20 }, () => 0));
  });

  it('maps spec spans of several multi-compartment cells', () => {
    const traces = resolveTraces([7, 9], [0, 3, 6], null, 6);

    expect(traces && nodeIdsOf(traces)).toEqual([7, 7, 7, 9, 9, 9]);
  });

  it('handles the per-column layout with repeated node ids', () => {
    const nodeIds = Array.from({ length: 20 }, () => 0);
    const indexPointers = Array.from({ length: 21 }, (_, i) => i);

    const traces = resolveTraces(nodeIds, indexPointers, null, 20);

    expect(traces && nodeIdsOf(traces)).toEqual(nodeIds);
  });

  it('handles per-column node_ids even when index_pointers follow the other convention', () => {
    const traces = resolveTraces([0, 0, 0, 1, 1, 1], [0, 3, 6], null, 6);

    expect(traces && nodeIdsOf(traces)).toEqual([0, 0, 0, 1, 1, 1]);
    expect(traces && new Set(nodeIdsOf(traces)).size).toBe(2);
  });

  it('handles per-column node_ids with empty index_pointers', () => {
    const traces = resolveTraces([0, 1, 2], [], null, 3);

    expect(traces && nodeIdsOf(traces)).toEqual([0, 1, 2]);
  });
});

describe('resolveTraces: rejects unrecognised layouts', () => {
  it('rejects spans that stop before the last column, instead of inventing phantom traces', () => {
    expect(resolveTraces([0, 1], [0, 2, 4], null, 6)).toBeNull();
  });

  it('rejects non-monotonic index_pointers', () => {
    expect(resolveTraces([0, 1], [0, 4, 2], null, 4)).toBeNull();
  });

  it('rejects index_pointers not starting at 0', () => {
    expect(resolveTraces([5, 6], [2, 3, 4], null, 4)).toBeNull();
  });

  it('rejects a mapping that fits neither layout', () => {
    expect(resolveTraces([7, 9], [0, 1, 2, 3, 4, 5, 6], null, 6)).toBeNull();
  });

  it('rejects empty node_ids and empty matrices', () => {
    expect(resolveTraces([], [0], null, 4)).toBeNull();
    expect(resolveTraces([0], [0, 1], null, 0)).toBeNull();
  });
});

describe('resolveTraces: labels', () => {
  it('brackets with the ordinal WITHIN the cell, not the global column', () => {
    const traces = resolveTraces([7, 9], [0, 3, 6], null, 6);

    expect(traces && labelsOf(traces)).toEqual(['7[0]', '7[1]', '7[2]', '9[0]', '9[1]', '9[2]']);
  });

  it('leaves a single-compartment cell unbracketed even beside a multi-compartment one', () => {
    const traces = resolveTraces([7, 9], [0, 3, 4], null, 4);

    expect(traces && labelsOf(traces)).toEqual(['7[0]', '7[1]', '7[2]', '9']);
  });

  it('keeps labels unique in every layout', () => {
    const cases = [
      resolveTraces(...([somaReport(20).nodeIds, somaReport(20).indexPointers, null, 20] as const)),
      resolveTraces([0], [0, 20], null, 20),
      resolveTraces(
        Array.from({ length: 20 }, () => 0),
        Array.from({ length: 21 }, (_, i) => i),
        null,
        20
      ),
      resolveTraces([0, 0, 0, 1, 1, 1], [0, 3, 6], null, 6),
    ];

    for (const traces of cases) {
      expect(traces).not.toBeNull();
      const labels = traces ? labelsOf(traces) : [];
      expect(new Set(labels).size).toBe(labels.length);
    }
  });
});

describe('resolveTraces: element ids', () => {
  it('carries the real element id per column when the dataset matches', () => {
    const traces = resolveTraces([0], [0, 3], [184, 197, 202], 3);

    expect(traces?.map((t) => t.elementId)).toEqual([184, 197, 202]);
  });

  it('ignores element_ids whose length does not match the columns', () => {
    const traces = resolveTraces([0], [0, 3], [184], 3);

    expect(traces?.map((t) => t.elementId)).toEqual([null, null, null]);
  });
});
