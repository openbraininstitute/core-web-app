import { describe, expect, it } from 'vitest';

import { layoutRunSheet, NodeKind, RUNS_NODE_ID, timeTicks, withoutInfo } from './layout';

import type { BlockGraph, BlockGraphNode } from './settings-graph';

const block = (id: string, column: number, isDefault = false): BlockGraphNode => ({
  id,
  rootElement: id.split('/')[0] ?? id,
  entry: id.split('/')[1] ?? '',
  label: id,
  subtitle: '',
  isDefault,
  column,
  row: 0,
});

// a stimulus targeting a neuron set, a recording on the default target, and the campaign's info
const settings: BlockGraph = {
  nodes: [
    block('default:All', 0, true),
    block('info', 0),
    block('neuron_sets/L5', 0),
    block('stimuli/pulse', 1),
    block('recordings/v', 1),
  ],
  edges: [
    {
      id: 'e1',
      source: 'neuron_sets/L5',
      target: 'stimuli/pulse',
      field: 'neuron_set',
      isDefault: false,
    },
    {
      id: 'e2',
      source: 'default:All',
      target: 'recordings/v',
      field: 'neuron_set',
      isDefault: true,
    },
  ],
};

describe('layoutRunSheet', () => {
  const { nodes, edges } = layoutRunSheet({
    inputIds: ['input:circuit'],
    settings: withoutInfo(settings),
    outputIds: ['output:spikes', 'output:voltages'],
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  it('lays inputs, settings by depth, runs and outputs out left to right', () => {
    const x = (id: string) => byId.get(id)?.x ?? Number.NaN;
    expect(x('input:circuit')).toBeLessThan(x('neuron_sets/L5'));
    expect(x('neuron_sets/L5')).toBeLessThan(x('stimuli/pulse'));
    expect(x('stimuli/pulse')).toBe(x('recordings/v'));
    expect(x('recordings/v')).toBeLessThan(x(RUNS_NODE_ID));
    expect(x(RUNS_NODE_ID)).toBeLessThan(x('output:spikes'));
    expect(byId.get('default:All')?.kind).toBe(NodeKind.Default);
  });

  it('leaves the campaign info out', () => {
    expect(byId.has('info')).toBe(false);
  });

  it('feeds the unfed blocks from the inputs, the runs from the blocks nothing depends on, and each output from the runs', () => {
    const pairs = edges.map((e) => `${e.source} -> ${e.target}`);
    expect(pairs).toEqual(
      expect.arrayContaining([
        'neuron_sets/L5 -> stimuli/pulse',
        'default:All -> recordings/v',
        'input:circuit -> neuron_sets/L5',
        'stimuli/pulse -> runs',
        'recordings/v -> runs',
        'runs -> output:spikes',
        'runs -> output:voltages',
      ])
    );
    // a default is not fed by the inputs, and a block feeding another does not feed the runs
    expect(pairs).not.toContain('input:circuit -> default:All');
    expect(pairs).not.toContain('neuron_sets/L5 -> runs');
    expect(edges.find((e) => e.source === 'default:All')?.dashed).toBe(true);
  });

  it('runs straight from the inputs when there are no settings', () => {
    const plain = layoutRunSheet({
      inputIds: ['input:a'],
      settings: { nodes: [], edges: [] },
      outputIds: [],
    });
    expect(plain.edges.map((e) => `${e.source} -> ${e.target}`)).toEqual(['input:a -> runs']);
  });
});

describe('timeTicks', () => {
  it('splits a run into about five round steps, ending on its length', () => {
    expect(timeTicks(1000)).toEqual([0, 200, 400, 600, 800, 1000]);
    expect(timeTicks(3000)).toEqual([0, 1000, 2000, 3000]);
    expect(timeTicks(250)).toEqual([0, 50, 100, 150, 200, 250]);
  });
});
