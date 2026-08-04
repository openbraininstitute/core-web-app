import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useGeneratedOutputs } from '@/features/scan-config/outputs/use-generated-outputs';

import type { ReactNode } from 'react';
import type { ITaskActivity } from '@/api/entitycore/types/entities/task-activity';

const invalidateDataListings = vi.hoisted(() => vi.fn());
const resolveStrategyForRef = vi.hoisted(() => vi.fn());

vi.mock('@/features/scan-config/outputs/invalidate-listings', () => ({ invalidateDataListings }));
vi.mock('@/features/scan-config/outputs/registry', () => ({
  resolveStrategyForRef,
  getOutputStrategyById: () => ({ toFiles: () => [] }),
}));

const RESULT = ExtendedEntitiesTypeDict.EFeatureExtractionResult;
const context = { virtualLabId: 'vl-1', projectId: 'proj-1' };

/** a strategy that resolves the ref to a task result belonging to the e-feature listing */
function resolvesToResult() {
  return {
    strategy: {
      resolve: async () => ({ strategyId: 'task-result', extendedType: RESULT, entity: {} }),
    },
    ref: { id: 'result-1' },
  };
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const execution = (id: string, generated: Array<{ id: string; type?: string }>) =>
  ({ id, generated }) as ITaskActivity;

describe('useGeneratedOutputs listing invalidation', () => {
  beforeEach(() => {
    invalidateDataListings.mockClear();
    resolveStrategyForRef.mockReset();
  });

  it('refreshes the listing of every type the run resolved', async () => {
    resolveStrategyForRef.mockResolvedValue(resolvesToResult());

    renderHook(
      () => useGeneratedOutputs({ execution: execution('run-1', [{ id: 'r1' }]), context }),
      {
        wrapper,
      }
    );

    await waitFor(() => expect(invalidateDataListings).toHaveBeenCalledTimes(1));
    expect(invalidateDataListings.mock.calls[0][0].listingTypes).toEqual([RESULT]);
  });

  it('still refreshes when one generated ref cannot be resolved', async () => {
    // a ref with no id keeps its query disabled forever, which must not hold the run back
    resolveStrategyForRef.mockResolvedValue(resolvesToResult());

    renderHook(
      () =>
        useGeneratedOutputs({
          execution: execution('run-1', [{ id: '' }, { id: 'r1' }]),
          context,
        }),
      { wrapper }
    );

    await waitFor(() => expect(invalidateDataListings).toHaveBeenCalledTimes(1));
  });

  it('refreshes again for the next run, even though it feeds the same listing', async () => {
    resolveStrategyForRef.mockResolvedValue(resolvesToResult());

    const { rerender } = renderHook(
      ({ activity }: { activity: ITaskActivity }) =>
        useGeneratedOutputs({ execution: activity, context }),
      { wrapper, initialProps: { activity: execution('run-1', [{ id: 'r1' }]) } }
    );

    await waitFor(() => expect(invalidateDataListings).toHaveBeenCalledTimes(1));

    // selecting another config swaps the execution without remounting the panel
    rerender({ activity: execution('run-2', [{ id: 'r2' }]) });

    await waitFor(() => expect(invalidateDataListings).toHaveBeenCalledTimes(2));
  });
});
