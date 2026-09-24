import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GlobalParametersSelection } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/global-parameters-selection';

import type { ConfigValue } from '@/features/scan-config/types';

const fixed = (value: number) => ({
  type: 'GlobalParameterSelection',
  value: { mode: 'fixed', value, bounds: null },
});

function renderTab(value: ConfigValue) {
  const onChange = vi.fn();
  render(<GlobalParametersSelection value={value} onChange={onChange} />);
  const [vInit, celsius] = screen.getAllByPlaceholderText('Value') as HTMLInputElement[];
  return { onChange, vInit, celsius };
}

describe('GlobalParametersSelection', () => {
  it('shows the defaults before global_parameters is written', () => {
    const { vInit, celsius } = renderTab(null);
    expect(vInit.value).toBe('-80');
    expect(celsius.value).toBe('34');
  });

  it('writes both simulation conditions on the first edit', () => {
    const mechanisms = { ion_channel_models: [] };
    const { onChange, celsius } = renderTab({ mechanisms });

    fireEvent.change(celsius, { target: { value: '22' } });

    expect(onChange).toHaveBeenCalledWith({
      mechanisms,
      global_parameters: { v_init: fixed(-80), celsius: fixed(22) },
    });
  });

  it('keeps stored values', () => {
    const { onChange, vInit } = renderTab({ global_parameters: { celsius: fixed(22) } });

    fireEvent.change(vInit, { target: { value: '-70' } });

    expect(onChange).toHaveBeenCalledWith({
      global_parameters: { v_init: fixed(-70), celsius: fixed(22) },
    });
  });
});
