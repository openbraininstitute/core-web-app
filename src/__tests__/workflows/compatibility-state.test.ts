import { describe, expect, it } from 'vitest';

import { deriveCompatibilityState } from '@/ui/segments/workflows/build/memodel/compatibility-state';

import type { CompatibilityCheckResponse } from '@/api/small-scale-simulator/single-neuron/compatibility';
import type { ApiResponse } from '@/types/small-scale-simulator/common';

const idleQuery = { isFetching: false, isError: false };

const response = (
  data: Partial<CompatibilityCheckResponse>
): ApiResponse<CompatibilityCheckResponse> => ({
  message: 'Compatibility check completed',
  data: {
    compatible: true,
    morphology_id: 'morph-1',
    emodel_id: 'emodel-1',
    ...data,
  },
});

describe('deriveCompatibilityState', () => {
  it('is idle until both models are selected', () => {
    expect(deriveCompatibilityState(false, idleQuery)).toEqual({ kind: 'idle' });
  });

  it('reports checking while the request is in flight', () => {
    expect(deriveCompatibilityState(true, { ...idleQuery, isFetching: true })).toEqual({
      kind: 'checking',
    });
  });

  it('reports compatible', () => {
    const state = deriveCompatibilityState(true, {
      ...idleQuery,
      data: response({ status: 'compatible', compatible: true }),
    });

    expect(state).toEqual({ kind: 'compatible' });
  });

  it('carries the NEURON output through for an incompatible pair', () => {
    const state = deriveCompatibilityState(true, {
      ...idleQuery,
      data: response({
        status: 'incompatible',
        compatible: false,
        error: 'Less than three axon sections are present!',
        details: 'NEURON: Less than three axon sections are present!\n cADpyr[0].init()',
      }),
    });

    expect(state).toEqual({
      kind: 'incompatible',
      detail: 'NEURON: Less than three axon sections are present!\n cADpyr[0].init()',
    });
  });

  it('separates a check that could not run from an incompatibility', () => {
    const state = deriveCompatibilityState(true, {
      ...idleQuery,
      data: response({ status: 'check_failed', compatible: false, error: 'download timed out' }),
    });

    expect(state).toEqual({ kind: 'check_failed', detail: 'download timed out' });
  });

  it('treats a failed request as a check that could not run, not an incompatibility', () => {
    expect(deriveCompatibilityState(true, { ...idleQuery, isError: true })).toEqual({
      kind: 'check_failed',
    });
  });

  it('falls back to the boolean when the simulator predates status', () => {
    expect(
      deriveCompatibilityState(true, { ...idleQuery, data: response({ compatible: true }) })
    ).toEqual({ kind: 'compatible' });

    expect(
      deriveCompatibilityState(true, { ...idleQuery, data: response({ compatible: false }) })
    ).toMatchObject({ kind: 'incompatible' });
  });
});
