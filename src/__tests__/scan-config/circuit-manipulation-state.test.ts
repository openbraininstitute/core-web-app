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
