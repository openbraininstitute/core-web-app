import { describe, expect, it } from 'vitest';

import { buildBlockGraph } from './settings-graph';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const ref = (block_dict_name: string, block_name: string) => ({ block_dict_name, block_name });

const variant = (type: string, properties: Record<string, unknown> = {}) => ({
  title: `${type} title`,
  description: '',
  properties: { type: { const: type, default: type }, ...properties },
});

const neuronSetField = {
  ui_element: 'reference',
  reference_types: ['BiophysicalNeuronSetReference'],
  title: 'Neuron Set',
};
const timestampsField = {
  ui_element: 'reference',
  reference_types: ['TimestampsReference'],
  title: 'Timestamps',
};

const dictionary = (group_order: number, oneOf: unknown[]) => ({
  ui_element: 'block_dictionary',
  title: '',
  description: '',
  group: 'Setup',
  group_order,
  reference_types: [],
  singular_name: '',
  additionalProperties: { oneOf },
});

const schema = {
  title: 'Test',
  description: '',
  group_order: ['Setup'],
  default_block_reference_labels: {
    BiophysicalNeuronSetReference: 'Default: All Biophysical Neurons',
  },
  properties: {
    type: { const: 'Test', default: 'Test' },
    initialize: {
      ui_element: 'block_single',
      title: 'Initialization',
      description: '',
      group: 'Setup',
      group_order: 0,
      properties: {},
    },
    neuron_sets: dictionary(1, [variant('IDNeuronSet')]),
    timestamps: dictionary(2, [variant('RegularTimestamps')]),
    stimuli: dictionary(3, [
      variant('Pulse', { neuron_set: neuronSetField, timestamps: timestampsField }),
    ]),
  },
} as unknown as ConfigSchema;

describe('buildBlockGraph', () => {
  it('draws an edge from each referred block to the block that refers to it', () => {
    const config: Config = {
      initialize: {},
      neuron_sets: { L5: { type: 'IDNeuronSet' } },
      timestamps: { every_100ms: { type: 'RegularTimestamps' } },
      stimuli: {
        pulse: {
          type: 'Pulse',
          neuron_set: ref('neuron_sets', 'L5'),
          timestamps: ref('timestamps', 'every_100ms'),
        },
      },
    };

    const { nodes, edges } = buildBlockGraph(schema, config);

    expect(nodes.map((n) => n.id)).toEqual([
      'initialize',
      'neuron_sets/L5',
      'timestamps/every_100ms',
      'stimuli/pulse',
    ]);
    expect(edges.map((e) => [e.source, e.target, e.field])).toEqual([
      ['neuron_sets/L5', 'stimuli/pulse', 'neuron_set'],
      ['timestamps/every_100ms', 'stimuli/pulse', 'timestamps'],
    ]);
    expect(nodes.find((n) => n.id === 'stimuli/pulse')).toMatchObject({
      column: 1,
      subtitle: 'Pulse title',
    });
  });

  it('draws an unset visible reference from its default, and hides one with no default', () => {
    const config: Config = {
      stimuli: { pulse: { type: 'Pulse', timestamps: null } },
    };

    const { nodes, edges } = buildBlockGraph(schema, config);

    // the timestamps reference has no default label in the schema, so it is hidden as in the form
    expect(edges).toEqual([
      expect.objectContaining({
        source: 'default:Default: All Biophysical Neurons',
        target: 'stimuli/pulse',
        field: 'neuron_set',
        isDefault: true,
      }),
    ]);
    expect(nodes[0]).toMatchObject({ isDefault: true, label: 'Default: All Biophysical Neurons' });
  });

  it('finds references nested in combination tuples and ones with no dictionary name', () => {
    const config: Config = {
      neuron_sets: {
        L5: { type: 'IDNeuronSet' },
        L6: { type: 'IDNeuronSet' },
        both: { type: 'IDNeuronSet', combined_with: [[ref('neuron_sets', 'L5'), 'union']] },
      },
      stimuli: { pulse: { type: 'Pulse', neuron_set: { block_name: 'both' } } },
    };

    const { nodes, edges } = buildBlockGraph(schema, config);

    expect(edges.map((e) => [e.source, e.target])).toEqual([
      ['neuron_sets/L5', 'neuron_sets/both'],
      ['neuron_sets/both', 'stimuli/pulse'],
    ]);
    expect(nodes.find((n) => n.id === 'stimuli/pulse')?.column).toBe(2);
  });

  it('skips a reference to a block that no longer exists', () => {
    const config: Config = {
      stimuli: { pulse: { type: 'Pulse', neuron_set: ref('neuron_sets', 'gone') } },
    };

    expect(buildBlockGraph(schema, config).edges).toEqual([]);
  });
});
