import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  type ConfigValue,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

import { renderInBlock } from './form-providers';

const BLOCK_SCHEMA = {
  title: 'Stimulus',
  description: '',
  properties: {
    amplitude: { title: 'Amplitude', ui_element: ScanConfigUIElementDict.FloatParameterSweep },
  },
} as unknown as TBlock;

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

function renderBlock(amplitude: ConfigValue, disabled = false) {
  return renderInBlock(
    <Block
      schema={SCHEMA}
      disabled={disabled}
      blockSchema={BLOCK_SCHEMA}
      entity={null}
      schemaMappingConfig={undefined}
      rootElement="stimulus"
    />,
    'stimulus',
    { amplitude }
  );
}

const collapseButton = () => screen.queryByRole('button', { name: 'Use a single value' });

describe('Block single value control', () => {
  it('shows on a sweep field that holds a list', () => {
    renderBlock([1, 2]);
    expect(collapseButton()).toBeTruthy();
  });

  it('is absent while the field holds a single value', () => {
    renderBlock(1);
    expect(collapseButton()).toBeNull();
  });

  it('writes the first value back as a single number', () => {
    const { store } = renderBlock([null, 3, 4]);
    fireEvent.click(collapseButton() as HTMLElement);
    expect(store.getSnapshot().stimulus).toEqual({ amplitude: 3 });
  });

  it('is hidden when the form is read-only', () => {
    renderBlock([1, 2], true);
    expect(collapseButton()).toBeNull();
  });
});
