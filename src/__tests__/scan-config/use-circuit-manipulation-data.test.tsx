import { act, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/error';

import type { TNeuronalManipulationProperties } from '@/features/scan-config/components/hooks/use-neuronal-manipulation-properties';
import type { Config, ConfigValue } from '@/features/scan-config/types';

const queryResult = vi.hoisted(() => ({
  value: {
    data: undefined as TNeuronalManipulationProperties | undefined,
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
import { createScanConfigStore } from '@/features/scan-config/store';
import { ScanConfigStoreProvider } from '@/features/scan-config/use-config-store';

type HarnessProps = {
  value?: ConfigValue;
  onChange?: (next: ConfigValue) => void;
};

function Reader({ value, onChange = () => {} }: HarnessProps) {
  const { data, loading, reason } = useCircuitManipulationData({
    reference: REFERENCE,
    value,
    onChange,
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

function renderHarness({ config, value, onChange }: HarnessProps & { config: Config }) {
  const store = createScanConfigStore(config);
  const commits = { count: 0 };
  const view = render(
    <ScanConfigStoreProvider store={store}>
      <Profiler
        id="reader"
        onRender={() => {
          commits.count += 1;
        }}
      >
        <Reader value={value} onChange={onChange} />
      </Profiler>
    </ScanConfigStoreProvider>
  );

  return { ...view, store, commits };
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
    renderHarness({ config: makeConfig([1]) });

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
    renderHarness({ config: makeConfig([1]) });

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
    const { container } = renderHarness({
      config: makeConfig([1]),
    });

    expect(
      screen.getByText('Could not load variables for the selected neuron set.')
    ).toBeInTheDocument();

    const reason = container.querySelector('[data-testid="reason"] > div');
    expect(reason?.children).toHaveLength(1);
  });

  it('shows the empty-state note when the endpoint returns no variables', () => {
    queryResult.value = {
      data: { variables: {}, warnings: [] },
      isLoading: false,
      isError: false,
      error: undefined,
    };
    renderHarness({ config: makeConfig([1]) });

    expect(
      screen.getByText('No ion-channel variables are available for the selected neuron set.')
    ).toBeInTheDocument();
  });

  it('shows the endpoint warning instead of the empty-state note', () => {
    const warning =
      "The neuron set selects no neurons in circuit 'c1' (population 'S1'; node sets SO_BS), so there are no mechanism variables to list.";
    queryResult.value = {
      data: { variables: {}, warnings: [warning] },
      isLoading: false,
      isError: false,
      error: undefined,
    };
    renderHarness({ config: makeConfig([1]) });

    expect(screen.getByText('Nothing to tune here')).toBeInTheDocument();
    expect(screen.getByText(warning)).toBeInTheDocument();
    expect(
      screen.queryByText('No ion-channel variables are available for the selected neuron set.')
    ).not.toBeInTheDocument();
  });

  it('exposes data and no reason once variables resolve', () => {
    queryResult.value = {
      data: {
        variables: { NaTg: { section_lists: ['somatic'], entity_id: 'ic', variables: {} } },
        warnings: [],
      },
      isLoading: false,
      isError: false,
      error: undefined,
    };
    renderHarness({ config: makeConfig([1]) });

    expect(screen.getByTestId('hasData')).toHaveTextContent('yes');
    expect(screen.getByTestId('reason')).toBeEmptyDOMElement();
  });

  it('resets the modification when the targeted neuron set changes', () => {
    const onChange = vi.fn();
    const { store } = renderHarness({
      config: makeConfig([1, 2]),
      value: { type: 'RangeModification', variable_name: 'gbar' },
      onChange,
    });

    expect(onChange).not.toHaveBeenCalled();

    // same selected block, different contents -> signature changes -> reset fires
    act(() => store.set(makeConfig([1, 2, 3])));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('does not re-render while another dictionary changes', () => {
    const { store, commits } = renderHarness({
      config: { ...makeConfig([1]), stimuli: { S: { amplitude: 1 } } },
    });
    const before = commits.count;

    act(() => store.set((previous) => ({ ...previous, stimuli: { S: { amplitude: 2 } } })));

    expect(commits.count).toBe(before);
  });

  it('does not reset when there is no modification to clear', () => {
    const onChange = vi.fn();
    const { store } = renderHarness({ config: makeConfig([1]), onChange });

    act(() => store.set(makeConfig([1, 2])));

    expect(onChange).not.toHaveBeenCalled();
  });
});
