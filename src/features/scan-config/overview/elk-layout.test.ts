import { describe, expect, it } from 'vitest';

import { roundedPath, routeRunSheet } from './elk-layout';
import { layoutRunSheet } from './layout';

import type { BlockGraph, BlockGraphNode } from './settings-graph';

const block = (id: string, column: number): BlockGraphNode => ({
  id,
  rootElement: id.split('/')[0] ?? id,
  entry: id.split('/')[1] ?? '',
  label: id,
  subtitle: '',
  isDefault: false,
  column,
  row: 0,
});

const settings: BlockGraph = {
  nodes: [block('neuron_sets/L5', 0), block('stimuli/pulse', 1), block('recordings/v', 1)],
  edges: [
    {
      id: 'e1',
      source: 'neuron_sets/L5',
      target: 'stimuli/pulse',
      field: 'neuron_set',
      isDefault: false,
    },
  ],
};

describe('routeRunSheet', () => {
  it('keeps each node in its column and routes every edge, labels placed', async () => {
    const base = layoutRunSheet({
      inputIds: ['input:a', 'input:b'],
      inputTargets: { 'input:a': ['neuron_sets/L5'], 'input:b': [] },
      settings,
      outputIds: ['output:x'],
    });
    const { nodes, edges } = await routeRunSheet(base);
    const x = (id: string) => nodes.find((n) => n.id === id)?.x ?? Number.NaN;

    // input:b feeds the runs directly, yet stays with the inputs
    expect(x('input:b')).toBe(x('input:a'));
    expect(x('input:a')).toBeLessThan(x('neuron_sets/L5'));
    expect(x('neuron_sets/L5')).toBeLessThan(x('stimuli/pulse'));
    expect(x('stimuli/pulse')).toBeLessThan(x('runs'));
    expect(x('runs')).toBeLessThan(x('output:x'));

    for (const e of edges) expect(e.points.length).toBeGreaterThanOrEqual(2);
    expect(edges.find((e) => e.id === 'e1')?.labelAt).toBeDefined();
  });
});

describe('roundedPath', () => {
  it('draws straight runs and rounds the corners', () => {
    expect(roundedPath([])).toBe('');
    expect(
      roundedPath([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])
    ).toBe('M 0 0 L 100 0');
    expect(
      roundedPath([
        { x: 0, y: 0 },
        { x: 50, y: 0 },
        { x: 50, y: 50 },
      ])
    ).toBe('M 0 0 L 40 0 Q 50 0 50 10 L 50 50');
  });
});
