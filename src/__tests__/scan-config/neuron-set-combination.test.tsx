import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NeuronSetCombination } from '@/features/scan-config/components/ui-elements/neuron-set-combination';
import { createScanConfigStore } from '@/features/scan-config/store';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { ScanConfigStoreProvider } from '@/features/scan-config/use-config-store';

import type {
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
      <ScanConfigStoreProvider store={createScanConfigStore({})}>
        <NeuronSetCombination
          paramSchema={paramSchema}
          value={[[null, 'union']]}
          onChange={() => {}}
          disabled={false}
          schema={schema}
        />
      </ScanConfigStoreProvider>
    );

    expect(screen.getByText('Default: All Virtual Neurons')).toBeInTheDocument();
  });
});
