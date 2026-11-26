import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import BlockDictionaryEntries from '@/features/scan-config/components/block-dictionary-entries';

import type { Config, IBlockDictionary } from '@/features/scan-config/types';

// the component only reads `additionalProperties.oneOf` off the schema, so a stub does
const ROOT_ELEMENT_SCHEMA = {
  additionalProperties: { oneOf: [] },
} as unknown as IBlockDictionary;

const ROOT_ELEMENT = 'stimuli';
const ENTRY = 'entry_a';

function renderEntries(overrides: Record<string, unknown> = {}) {
  const config: Config = { [ROOT_ELEMENT]: { [ENTRY]: { type: 'block_type' } } };

  const props = {
    config,
    setConfig: vi.fn(),
    rootElementSchema: ROOT_ELEMENT_SCHEMA,
    rootElement: ROOT_ELEMENT,
    selectedEntry: ENTRY,
    selectedRootElement: ROOT_ELEMENT,
    handleEntryClick: vi.fn(),
    campaignId: '',
    loading: false,
    readOnly: false,
    isChatReady: true,
    setEditing: vi.fn(),
    setSelectedEntry: vi.fn(),
    setSelectedRootElement: vi.fn(),
    allEntries: new Set([ENTRY]),
    newKey: ENTRY,
    setNewKey: vi.fn(),
    isEditingKey: false,
    setIsEditingKey: vi.fn(),
    errors: null,
    highlights: [],
    visible: true,
    ...overrides,
  } as React.ComponentProps<typeof BlockDictionaryEntries>;

  const utils = render(
    <>
      <input data-testid="outside" />
      <BlockDictionaryEntries {...props} />
    </>
  );

  return {
    ...utils,
    rerenderWith: (next: Record<string, unknown> = {}) =>
      utils.rerender(
        <>
          <input data-testid="outside" />
          <BlockDictionaryEntries {...({ ...props, ...next } as typeof props)} />
        </>
      ),
  };
}

describe('BlockDictionaryEntries', () => {
  it('focuses the rename input when edit mode opens, and does not steal focus back on later renders', () => {
    const { rerenderWith } = renderEntries({ isEditingKey: true });

    const renameInput = document.querySelector<HTMLInputElement>(
      `#${ENTRY.replace(/_/g, '-')}-menu-block-dictionary-sub-entry__item input`
    );
    expect(renameInput).not.toBeNull();
    expect(document.activeElement).toBe(renameInput);

    // regression: an inline `ref` callback re-ran `.focus()` on every commit
    const outside = screen.getByTestId('outside');
    outside.focus();
    expect(document.activeElement).toBe(outside);

    rerenderWith({ loading: true });
    expect(document.activeElement).toBe(outside);

    rerenderWith({ loading: false });
    expect(document.activeElement).toBe(outside);
  });

  it('renames every reference to the entry, in `initialize` and in every section', () => {
    const ref = (name: string) => ({ block_dict_name: 'neuron_sets', block_name: name });
    const config: Config = {
      neuron_sets: { BioAll: { type: 'PredefinedNeuronSet' }, Other: { type: 'IDNeuronSet' } },
      initialize: {
        circuit: { id_str: 'circuit-1' },
        node_set: ref('BioAll'),
        neuron_set: ref('BioAll'),
        include_virtual_populations: true,
      },
      stimuli: {
        s1: {
          neuron_set: ref('BioAll'),
          targeted: ref('Other'),
          timestamps: { block_dict_name: 'timestamps', block_name: 'BioAll' },
        },
        s2: {
          combined_with: [
            [ref('BioAll'), 'union'],
            [null, 'difference'],
          ],
        },
      },
    };
    const before = structuredClone(config);
    const setConfig = vi.fn();

    renderEntries({
      config,
      setConfig,
      rootElement: 'neuron_sets',
      selectedRootElement: 'neuron_sets',
      selectedEntry: 'BioAll',
      allEntries: new Set(['BioAll', 'Other', 's1', 's2']),
      newKey: 'AllBio123',
      isEditingKey: true,
    });

    fireEvent.keyDown(screen.getByDisplayValue('AllBio123'), { key: 'Enter' });

    expect(setConfig).toHaveBeenCalledWith({
      neuron_sets: { AllBio123: { type: 'PredefinedNeuronSet' }, Other: { type: 'IDNeuronSet' } },
      initialize: {
        circuit: { id_str: 'circuit-1' },
        node_set: ref('AllBio123'),
        neuron_set: ref('AllBio123'),
        include_virtual_populations: true,
      },
      stimuli: {
        s1: {
          neuron_set: ref('AllBio123'),
          targeted: ref('Other'),
          timestamps: { block_dict_name: 'timestamps', block_name: 'BioAll' },
        },
        s2: {
          combined_with: [
            [ref('AllBio123'), 'union'],
            [null, 'difference'],
          ],
        },
      },
    });
    expect(config).toEqual(before);
  });

  it('renders the tooltip trigger as the tab itself, without nesting a button', () => {
    const { container } = renderEntries();

    const tab = container.querySelector(
      `#${ENTRY.replace(/_/g, '-')}-menu-block-dictionary-sub-entry__item`
    );
    expect(tab).not.toBeNull();
    expect(tab).toHaveAttribute('data-slot', 'tooltip-trigger');
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
