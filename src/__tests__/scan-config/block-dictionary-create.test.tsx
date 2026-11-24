import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/ai-agent', () => ({
  useAIConfig: () => ({ aiConfig: null, isChatReady: false }),
}));
vi.mock('@/features/feature-flags', () => ({ useFlag: () => false }));

import BlockDictionary from '@/features/scan-config/components/ui-blocks/block-dictionary';
import { createScanConfigStore } from '@/features/scan-config/store';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { ScanConfigStoreProvider } from '@/features/scan-config/use-config-store';

import type { ConfigSchema, IBlockDictionary } from '@/features/scan-config/types';

const dictionarySchema = {
  ui_element: ScanConfigUIElementDict.BlockDictionary,
  singular_name: 'Neuron set',
  additionalProperties: {
    oneOf: [
      {
        title: 'By ID',
        description: 'A list of ids',
        properties: { type: { const: 'IDNeuronSet', default: 'IDNeuronSet' } },
      },
    ],
  },
} as unknown as IBlockDictionary;

const schema = {
  type: 'object',
  properties: { neuron_sets: dictionarySchema },
} as unknown as ConfigSchema;

function renderPicker() {
  const store = createScanConfigStore({ neuron_sets: {} });
  const setSelectedEntry = vi.fn();
  render(
    <ScanConfigStoreProvider store={store}>
      <BlockDictionary
        schema={schema}
        blockDictionarySchema={dictionarySchema}
        selectedRootElement="neuron_sets"
        selectedEntry=""
        setSelectedEntry={setSelectedEntry}
        campaignId=""
        loading={false}
        entity={null}
        schemaMappingConfig={undefined}
      />
    </ScanConfigStoreProvider>
  );

  return { store, setSelectedEntry };
}

describe('BlockDictionary type picker', () => {
  it('creates an entry of the picked type and selects it', () => {
    const { store, setSelectedEntry } = renderPicker();

    fireEvent.click(screen.getByTestId('scan-config-variant-IDNeuronSet'));

    const entries = Object.entries(store.getSnapshot().neuron_sets as object);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.[1]).toMatchObject({ type: 'IDNeuronSet' });
    expect(setSelectedEntry).toHaveBeenCalledWith(entries[0]?.[0]);
  });

  it('gives two entries with different names for two clicks before a re-render', () => {
    const { store } = renderPicker();
    const variant = screen.getByTestId('scan-config-variant-IDNeuronSet');

    act(() => {
      fireEvent.click(variant);
      fireEvent.click(variant);
    });

    expect(Object.keys(store.getSnapshot().neuron_sets as object)).toHaveLength(2);
  });
});
