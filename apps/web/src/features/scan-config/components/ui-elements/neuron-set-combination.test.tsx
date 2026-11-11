import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NeuronSetCombination } from '@/features/scan-config/components/ui-elements/neuron-set-combination';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type {
  Config,
  ConfigSchema,
  NeuronSetCombination as NeuronSetCombinationSchema,
} from '@/features/scan-config/types';

describe('NeuronSetCombination', () => {
  it("shows each row's neuron set picker when the config answers only the field's tag", () => {
    // the synapse parameterization shape: defaults by tag, no type-keyed labels
    const schema = {
      properties: {},
      default_block_reference_labels: {},
      reference_tag_defaults: {
        virtual_neuron_set_operand: { name: 'Default: All Virtual Neurons' },
      },
    } as unknown as ConfigSchema;

    const paramSchema = {
      ui_element: ScanConfigUIElementDict.NeuronSetCombination,
      reference_types: ['VirtualNeuronSetReference'],
      reference_tag: 'virtual_neuron_set_operand',
    } as NeuronSetCombinationSchema;

    render(
      <NeuronSetCombination
        paramSchema={paramSchema}
        value={[[null, 'union']]}
        onChange={() => {}}
        disabled={false}
        config={{} as Config}
        schema={schema}
      />
    );

    expect(screen.getByText('Default: All Virtual Neurons')).toBeInTheDocument();
  });
});
