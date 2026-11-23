import { describe, expect, it } from 'vitest';

import {
  clearDeletedBlockReferences,
  resolveNeuronSet,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/state';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { Config } from '@/features/scan-config/types';

describe('circuit ion-channel manipulation state', () => {
  it('changes the target signature when the referenced neuron-set content changes', () => {
    const firstConfig: Config = {
      neuron_sets: {
        selected: {
          type: 'NeuronSet',
          population: 'S1',
          node_id: [1, 2],
        },
      },
    };
    const secondConfig: Config = {
      neuron_sets: {
        selected: {
          type: 'NeuronSet',
          population: 'S1',
          node_id: [1, 2, 3],
        },
      },
    };
    const reference = {
      block_name: 'selected',
      block_dict_name: 'neuron_sets',
    };

    expect(resolveNeuronSet(firstConfig, reference).signature).not.toBe(
      resolveNeuronSet(secondConfig, reference).signature
    );
  });

  describe('a combined neuron set', () => {
    const ref = (name: string) => ({ block_name: name, block_dict_name: 'neuron_sets' });
    const config = (third: number[]): Config => ({
      neuron_sets: {
        Combined: {
          type: 'BiophysicalCombinedNeuronSet',
          base_neuron_set: ref('first'),
          combined_with: [
            [ref('second'), 'union'],
            [ref('missing'), 'intersect'],
          ],
        },
        first: { type: 'BiophysicalPopulationIDNeuronSet', neuron_ids: { elements: [1] } },
        second: { type: 'BiophysicalPopulationIDNeuronSet', neuron_ids: { elements: third } },
        unrelated: { type: 'AllBiophysicalNeurons' },
      },
    });

    it('carries the sets it references, not the others or the missing ones', () => {
      const resolved = resolveNeuronSet(config([2]), ref('Combined'));

      expect(Object.keys(resolved.referencedSets).sort()).toEqual(['first', 'second']);
    });

    it('changes the target signature when a referenced set changes', () => {
      expect(resolveNeuronSet(config([2]), ref('Combined')).signature).not.toBe(
        resolveNeuronSet(config([2, 3]), ref('Combined')).signature
      );
    });

    it('carries no sets for a neuron set without references', () => {
      expect(resolveNeuronSet(config([2]), ref('first')).referencedSets).toEqual({});
    });
  });

  it('clears a circuit manipulation when its referenced neuron-set entry is deleted', () => {
    const schema = {
      properties: {
        initialize: {
          ui_element: ScanConfigUIElementDict.BlockSingle,
          properties: {
            type: { const: 'Initialize', default: 'Initialize' },
            neuron_set: {
              ui_element: ScanConfigUIElementDict.Reference,
              reference_type: 'NeuronSet',
              title: 'Neuron set',
              description: '',
            },
            manipulation: {
              ui_element: ScanConfigUIElementDict.ionChannelVariableModificationBySectionList,
              property_source_field: 'neuron_set',
              title: 'Manipulation',
              description: '',
              type: 'object',
              properties: {
                type: {
                  const: 'BySectionListModification',
                  default: 'BySectionListModification',
                },
              },
            },
          },
        },
        neuron_sets: {
          ui_element: ScanConfigUIElementDict.BlockDictionary,
          additionalProperties: {
            oneOf: [
              {
                properties: {
                  type: { const: 'NeuronSet', default: 'NeuronSet' },
                },
              },
            ],
          },
        },
      },
    } as unknown as Parameters<typeof clearDeletedBlockReferences>[1];
    const config: Config = {
      initialize: {
        type: 'Initialize',
        neuron_set: {
          block_name: 'target-set',
          block_dict_name: 'neuron_sets',
        },
        manipulation: {
          type: 'BySectionListModification',
          ion_channel_id: 'channel-1',
          variable_name: 'gbar',
        },
      },
      neuron_sets: {
        'target-set': {
          type: 'NeuronSet',
        },
      },
    };

    const next = clearDeletedBlockReferences(config, schema, 'neuron_sets', 'target-set');

    expect(next.initialize).toEqual({
      type: 'Initialize',
      neuron_set: null,
      manipulation: null,
    });
  });
});
