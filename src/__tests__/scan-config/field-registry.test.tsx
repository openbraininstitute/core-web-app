import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import { FIELD_REGISTRY } from '@/features/scan-config/components/ui-elements/registry';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

import { renderInBlock } from './form-providers';

const NOT_FIELDS: string[] = [
  ScanConfigUIElementDict.BlockUnion,
  ScanConfigUIElementDict.BlockSingle,
  ScanConfigUIElementDict.BlockDictionary,
  ScanConfigUIElementDict.EModelOptimisationParameters,
];

describe('field registry', () => {
  it('has a component for every field kind', () => {
    const fieldKinds = Object.values(ScanConfigUIElementDict).filter(
      (kind) => !NOT_FIELDS.includes(kind)
    );
    const missing = fieldKinds.filter((kind) => !(kind in FIELD_REGISTRY));

    expect(missing).toEqual([]);
  });
});

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

const BLOCK = {
  title: 'Stimulus',
  description: '',
  properties: {
    label: { title: 'Label', ui_element: ScanConfigUIElementDict.StringInput },
    shape: {
      title: 'Shape',
      ui_element: ScanConfigUIElementDict.Object,
      properties: {
        name: { title: 'Name', ui_element: ScanConfigUIElementDict.StringInput },
        note: { title: 'Note', ui_element: ScanConfigUIElementDict.StringInput },
      },
    },
  },
} as unknown as TBlock;

function renderStimulus() {
  const view = renderInBlock(
    <Block
      schema={SCHEMA}
      disabled={false}
      blockSchema={BLOCK}
      entity={null}
      schemaMappingConfig={undefined}
      rootElement="stimulus"
    />,
    'stimulus',
    { label: 'l', shape: { name: 'n', note: 'o' } }
  );
  const input = (field: string) =>
    screen.getByTestId(`scan-config-field-${field}`).querySelector('input') as HTMLInputElement;

  return { ...view, input };
}

describe('Block with an object field', () => {
  it('writes one key of the nested object and keeps the rest', () => {
    const { store, input } = renderStimulus();

    fireEvent.change(input('name'), { target: { value: 'changed' } });

    expect(store.getSnapshot().stimulus).toEqual({
      label: 'l',
      shape: { name: 'changed', note: 'o' },
    });
  });

  it('keeps both of two nested writes made in a row', () => {
    const { store, input } = renderStimulus();

    act(() => {
      fireEvent.change(input('name'), { target: { value: 'a' } });
      fireEvent.change(input('note'), { target: { value: 'b' } });
    });

    expect(store.getSnapshot().stimulus).toEqual({ label: 'l', shape: { name: 'a', note: 'b' } });
  });
});
