import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GlobalParametersSelection } from '@/features/scan-config/components/ui-blocks/emodel-optimisation/global-parameters-selection';

import type { ErrorObject } from 'ajv';
import type { ConfigValue, IEModelOptimisationParameters } from '@/features/scan-config/types';

const fixed = (value: number) => ({
  type: 'GlobalParameterSelection',
  value: { mode: 'fixed', value, bounds: null },
});

// the published schema default, shaped like ObiOne's (no `bounds` key)
const schemaDefault = (value: number) => ({
  type: 'GlobalParameterSelection',
  value: { mode: 'fixed', value },
});

const rootSchema = {
  properties: {
    global_parameters: { default: { v_init: schemaDefault(-65), celsius: schemaDefault(30) } },
  },
} as unknown as IEModelOptimisationParameters;

function renderTab(value: ConfigValue, errors: Partial<ErrorObject>[] = []) {
  const onChange = vi.fn();
  render(
    <GlobalParametersSelection
      rootSchema={rootSchema}
      value={value}
      onChange={onChange}
      errors={errors as ErrorObject[]}
    />
  );
  const [vInit, celsius] = screen.getAllByPlaceholderText('Value') as HTMLInputElement[];
  return { onChange, vInit, celsius };
}

describe('GlobalParametersSelection', () => {
  it('shows the schema defaults before global_parameters is written', () => {
    const { vInit, celsius } = renderTab(null);
    expect(vInit.value).toBe('-65');
    expect(celsius.value).toBe('30');
  });

  it('writes both simulation conditions on the first edit', () => {
    const mechanisms = { ion_channel_models: [] };
    const { onChange, celsius } = renderTab({ mechanisms });

    fireEvent.change(celsius, { target: { value: '22' } });

    expect(onChange).toHaveBeenCalledWith({
      mechanisms,
      global_parameters: { v_init: schemaDefault(-65), celsius: fixed(22) },
    });
  });

  it('keeps stored values', () => {
    const { onChange, vInit } = renderTab({ global_parameters: { celsius: fixed(22) } });

    fireEvent.change(vInit, { target: { value: '-70' } });

    expect(onChange).toHaveBeenCalledWith({
      global_parameters: { v_init: fixed(-70), celsius: fixed(22) },
    });
  });

  it('never fills a stored config with the default', () => {
    const q10 = { type: 'GlobalParameterSelection', value: { mode: 'bounds', bounds: [1, 3] } };
    const { onChange, vInit, celsius } = renderTab({
      global_parameters: { celsius: fixed(22), q10_NaTg: q10 },
    });

    expect(vInit.value).toBe('');

    fireEvent.change(celsius, { target: { value: '30' } });

    expect(onChange).toHaveBeenCalledWith({
      global_parameters: { celsius: fixed(30), q10_NaTg: q10 },
    });
  });

  it('highlights the field whose value fails schema validation', () => {
    const { vInit, celsius } = renderTab(
      { global_parameters: { celsius: { ...fixed(22), value: { mode: 'fixed', value: null } } } },
      [{ instancePath: '/global_parameters/celsius/value/value', keyword: 'type' }]
    );

    expect(celsius).toHaveClass('border-red-500');
    expect(celsius).toHaveAttribute('aria-invalid', 'true');
    expect(vInit).not.toHaveClass('border-red-500');
    expect(vInit).toHaveAttribute('aria-invalid', 'false');
    // fields are only highlighted: no warning or check icons on the rows
    expect(screen.queryByRole('img')).toBeNull();
  });

  const bounds = (lower: number | null, upper: number | null) => ({
    global_parameters: {
      celsius: {
        type: 'GlobalParameterSelection',
        value: { mode: 'bounds', value: null, bounds: [lower, upper] },
      },
    },
  });

  it('explains bounds that do not increase', () => {
    renderTab(bounds(30, 20), [
      { instancePath: '/global_parameters/celsius/value/bounds', keyword: 'strictly_increasing' },
    ]);

    expect(screen.getByPlaceholderText('Min')).toHaveClass('border-red-500');
    expect(screen.getByPlaceholderText('Max')).toHaveClass('border-red-500');
    expect(screen.getByText('Max must be greater than min.')).toBeInTheDocument();
  });

  it('highlights only a missing bound, without the ordering message', () => {
    renderTab(bounds(30, null), [
      { instancePath: '/global_parameters/celsius/value/bounds/1', keyword: 'type' },
    ]);

    expect(screen.getByPlaceholderText('Min')).not.toHaveClass('border-red-500');
    expect(screen.getByPlaceholderText('Max')).toHaveClass('border-red-500');
    expect(screen.queryByText('Max must be greater than min.')).toBeNull();
  });
});
