import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/error';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import type { Config, ConfigValue } from '@/features/scan-config/types';

const queryResult = vi.hoisted(() => ({
  value: {
    data: undefined as MechanismVariablesRoot | undefined,
    isLoading: false,
    isError: false,
    error: undefined as unknown,
  },
}));

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'pj-1' }),
}));
vi.mock('@/features/scan-config/components/hooks/use-neuronal-manipulation-properties', () => ({
  useNeuronalManipulationProperties: () => queryResult.value,
}));

import { useCircuitManipulationData } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/circuit/use-circuit-manipulation-data';

type HarnessProps = {
  config: Config;
  state: Record<string, ConfigValue>;
  setState: (next: Record<string, ConfigValue>) => void;
};

function Harness({ config, state, setState }: HarnessProps) {
  const { data, loading, reason } = useCircuitManipulationData({
    config,
    state,
    setState,
    sourceField: 'neuron_set',
    fieldKey: 'manipulation',
    endpoint: '/circuit-neuronal-manipulation-properties-by-neuron-set',
    entityId: 'circuit-1',
  });

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="hasData">{data ? 'yes' : 'no'}</span>
      <div data-testid="reason">{reason}</div>
    </div>
  );
}

const REFERENCE: ConfigValue = { block_name: 'exc', block_dict_name: 'neuron_sets' };

function makeConfig(nodeIds: number[]): Config {
  return {
    neuron_sets: {
      exc: { type: 'NeuronSet', population: 'S1', node_id: nodeIds },
    },
  };
}

describe('useCircuitManipulationData', () => {
  beforeEach(() => {
    queryResult.value = { data: undefined, isLoading: false, isError: false, error: undefined };
  });

  it('reports loading and renders no reason while variables are being fetched', () => {
    queryResult.value = { data: undefined, isLoading: true, isError: false, error: undefined };
    render(
      <Harness config={makeConfig([1])} state={{ neuron_set: REFERENCE }} setState={vi.fn()} />
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('true');
    expect(screen.getByTestId('reason')).toBeEmptyDOMElement();
  });

  it('surfaces the generic error headline plus the endpoint detail on failure', () => {
    queryResult.value = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError('request failed', {
        message: 'Neuron set "exc" has no biophysical neurons.',
      }),
    };
    render(
      <Harness config={makeConfig([1])} state={{ neuron_set: REFERENCE }} setState={vi.fn()} />
    );

    expect(
      screen.getByText('Could not load variables for the selected neuron set.')
    ).toBeInTheDocument();
    expect(screen.getByText('Neuron set "exc" has no biophysical neurons.')).toBeInTheDocument();
  });

  it('shows only the generic headline when the endpoint gives no usable detail', () => {
    queryResult.value = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError('request failed', {}),
    };
    const { container } = render(
      <Harness config={makeConfig([1])} state={{ neuron_set: REFERENCE }} setState={vi.fn()} />
    );

    expect(
      screen.getByText('Could not load variables for the selected neuron set.')
    ).toBeInTheDocument();

    const reason = container.querySelector('[data-testid="reason"] > div');
    expect(reason?.children).toHaveLength(1);
  });

  it('shows the empty-state note when the endpoint returns no variables', () => {
    queryResult.value = { data: {}, isLoading: false, isError: false, error: undefined };
    render(
      <Harness config={makeConfig([1])} state={{ neuron_set: REFERENCE }} setState={vi.fn()} />
    );

    expect(
      screen.getByText('No ion-channel variables are available for the selected neuron set.')
    ).toBeInTheDocument();
  });

  it('exposes data and no reason once variables resolve', () => {
    queryResult.value = {
      data: { NaTg: { section_lists: ['somatic'], entity_id: 'ic', variables: {} } },
      isLoading: false,
      isError: false,
      error: undefined,
    };
    render(
      <Harness config={makeConfig([1])} state={{ neuron_set: REFERENCE }} setState={vi.fn()} />
    );

    expect(screen.getByTestId('hasData')).toHaveTextContent('yes');
    expect(screen.getByTestId('reason')).toBeEmptyDOMElement();
  });

  it('resets the modification when the targeted neuron set changes', () => {
    const setState = vi.fn();
    const state: Record<string, ConfigValue> = {
      neuron_set: REFERENCE,
      manipulation: { type: 'RangeModification', variable_name: 'gbar' },
    };
    const { rerender } = render(
      <Harness config={makeConfig([1, 2])} state={state} setState={setState} />
    );

    expect(setState).not.toHaveBeenCalled();

    // same selected block, different contents -> signature changes -> reset fires
    rerender(<Harness config={makeConfig([1, 2, 3])} state={state} setState={setState} />);

    expect(setState).toHaveBeenCalledWith({ ...state, manipulation: null });
  });

  it('does not reset when there is no modification to clear', () => {
    const setState = vi.fn();
    const state: Record<string, ConfigValue> = { neuron_set: REFERENCE };
    const { rerender } = render(
      <Harness config={makeConfig([1])} state={state} setState={setState} />
    );

    rerender(<Harness config={makeConfig([1, 2])} state={state} setState={setState} />);

    expect(setState).not.toHaveBeenCalled();
  });
});
