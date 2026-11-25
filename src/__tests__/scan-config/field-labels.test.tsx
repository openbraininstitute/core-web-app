import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

import { renderInBlock } from './form-providers';

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

const BLOCK = {
  title: 'Stimulus',
  description: '',
  properties: {
    name: { title: 'Name', ui_element: ScanConfigUIElementDict.StringInput },
    gain: { title: 'Gain', ui_element: ScanConfigUIElementDict.FloatInput },
    enabled: {
      title: 'Enabled',
      description: 'Whether the stimulus is applied during the run.',
      ui_element: ScanConfigUIElementDict.BooleanInput,
    },
    values: { title: 'Values', ui_element: ScanConfigUIElementDict.DiscreteProbabilities },
    shape: {
      title: 'Shape',
      ui_element: ScanConfigUIElementDict.Object,
      properties: {
        name: { title: 'Inner name', ui_element: ScanConfigUIElementDict.StringInput },
      },
    },
  },
} as unknown as TBlock;

function renderStimulus() {
  return renderInBlock(
    <Block
      schema={SCHEMA}
      disabled={false}
      blockSchema={BLOCK}
      entity={null}
      schemaMappingConfig={undefined}
      rootElement="stimulus"
    />,
    'stimulus',
    { name: 'outer', gain: 2, enabled: false, values: [1], shape: { name: 'inner' } }
  );
}

describe('field labels', () => {
  it('names a one-control field by its label', () => {
    renderStimulus();

    expect(screen.getByLabelText('Name')).toHaveValue('outer');
    expect(screen.getByLabelText('Gain')).toHaveValue('2');
  });

  it('keeps two fields with the same key apart', () => {
    const { store } = renderStimulus();

    expect(screen.getByLabelText('Inner name')).toHaveValue('inner');
    fireEvent.change(screen.getByLabelText('Inner name'), { target: { value: 'changed' } });

    expect(store.getSnapshot().stimulus).toMatchObject({
      name: 'outer',
      shape: { name: 'changed' },
    });
  });

  it('names a boolean field by its title, not by its description', () => {
    renderStimulus();

    expect(screen.getByLabelText('Enabled')).toHaveAttribute('type', 'checkbox');
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeTruthy();
  });

  it('toggles a boolean field from its label', () => {
    const { store } = renderStimulus();

    fireEvent.click(screen.getByText('Enabled'));

    expect(store.getSnapshot().stimulus).toMatchObject({ enabled: true });
  });

  it('names a field with several controls as a group', () => {
    renderStimulus();

    expect(screen.getByRole('group', { name: 'Values' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Shape' })).toBeTruthy();
  });

  it('gives every label a target that exists', () => {
    const { container } = renderStimulus();

    const dangling = [...container.querySelectorAll('label[for]')].filter(
      (label) => !container.querySelector(`[id="${label.getAttribute('for')}"]`)
    );

    expect(dangling).toEqual([]);
  });
});
