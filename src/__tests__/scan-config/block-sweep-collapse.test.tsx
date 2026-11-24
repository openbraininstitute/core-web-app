import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  type ConfigValue,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';

const BLOCK_SCHEMA = {
  title: 'Stimulus',
  description: '',
  properties: {
    amplitude: { title: 'Amplitude', ui_element: ScanConfigUIElementDict.FloatParameterSweep },
  },
} as unknown as TBlock;

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

function renderBlock(amplitude: ConfigValue, disabled = false) {
  const setState = vi.fn();
  render(
    <Block
      schema={SCHEMA}
      disabled={disabled}
      blockSchema={BLOCK_SCHEMA}
      entity={null}
      state={{ amplitude }}
      setState={setState}
      schemaMappingConfig={undefined}
      rootElement="stimulus"
    />
  );
  return { setState };
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
    const { setState } = renderBlock([null, 3, 4]);
    fireEvent.click(collapseButton() as HTMLElement);
    expect(setState).toHaveBeenCalledWith({ amplitude: 3 });
  });

  it('is hidden when the form is read-only', () => {
    renderBlock([1, 2], true);
    expect(collapseButton()).toBeNull();
  });
});
