import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/error';

import type { MechanismVariablesRoot } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';

const queryResult = vi.hoisted(() => ({
  value: {
    data: undefined as MechanismVariablesRoot | undefined,
    isLoading: false,
    isError: false,
    error: undefined as unknown,
  },
  lastParams: undefined as unknown,
}));

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl-1', projectId: 'pj-1' }),
}));
vi.mock('@/features/scan-config/components/hooks/use-neuronal-manipulation-properties', () => ({
  useNeuronalManipulationProperties: (params: unknown) => {
    queryResult.lastParams = params;
    return queryResult.value;
  },
}));

import { useMeModelManipulationData } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/me-model/use-memodel-manipulation-data';

function Harness() {
  const { data, loading, reason } = useMeModelManipulationData({
    endpoint: '/memodel-neuronal-manipulation-properties',
    entityId: 'memodel-1',
  });

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="hasData">{data ? 'yes' : 'no'}</span>
      <div data-testid="reason">{reason}</div>
    </div>
  );
}

describe('useMeModelManipulationData', () => {
  beforeEach(() => {
    queryResult.value = { data: undefined, isLoading: false, isError: false, error: undefined };
    queryResult.lastParams = undefined;
  });

  it('calls the properties hook without includeNeuronSet / neuronSet', () => {
    render(<Harness />);

    expect(queryResult.lastParams).toEqual({
      workspace: { virtualLabId: 'vl-1', projectId: 'pj-1' },
      entityId: 'memodel-1',
      endpoint: '/memodel-neuronal-manipulation-properties',
    });
  });

  it('surfaces a model-scoped error note on failure', () => {
    queryResult.value = {
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError('request failed', {
        message: 'MEModel has no biophysical mechanisms.',
      }),
    };
    render(<Harness />);

    expect(
      screen.getByText('Could not load ion-channel variables for this model.')
    ).toBeInTheDocument();
    expect(screen.getByText('MEModel has no biophysical mechanisms.')).toBeInTheDocument();
  });

  it('shows the empty-state note when the endpoint returns no variables', () => {
    queryResult.value = { data: {}, isLoading: false, isError: false, error: undefined };
    render(<Harness />);

    expect(
      screen.getByText('No ion-channel variables are available for this model.')
    ).toBeInTheDocument();
  });

  it('exposes data and no reason once variables resolve', () => {
    queryResult.value = {
      data: { NaTg: { section_lists: ['somatic'], entity_id: 'ic', variables: {} } },
      isLoading: false,
      isError: false,
      error: undefined,
    };
    render(<Harness />);

    expect(screen.getByTestId('hasData')).toHaveTextContent('yes');
    expect(screen.getByTestId('reason')).toBeEmptyDOMElement();
  });
});
