import { describe, expect, it } from 'vitest';

import {
  blocksBuild,
  deriveCompatibilityState,
} from '@/ui/segments/workflows/build/memodel/compatibility-state';

import type { CompatibilityCheckResponse } from '@/api/small-scale-simulator/single-neuron/compatibility';
import type { ApiResponse } from '@/types/small-scale-simulator/common';
import type { CompatibilityState } from '@/ui/segments/workflows/build/memodel/compatibility-state';

const base = { selectionComplete: true, isFetching: false, isError: false };

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
    expect(deriveCompatibilityState({ ...base, selectionComplete: false })).toEqual({
      kind: 'idle',
    });
  });

  it('reports checking while the request is in flight', () => {
    expect(deriveCompatibilityState({ ...base, isFetching: true })).toEqual({ kind: 'checking' });
  });

  it('reports compatible', () => {
    const state = deriveCompatibilityState({
      ...base,
      data: response({ status: 'compatible', compatible: true }),
    });

    expect(state).toEqual({ kind: 'compatible' });
  });

  it('carries the NEURON message through for an incompatible pair', () => {
    const state = deriveCompatibilityState({
      ...base,
      data: response({
        status: 'incompatible',
        compatible: false,
        error: 'Less than three axon sections are present!',
        details: 'NEURON: Less than three axon sections are present!\n cADpyr[0].init()',
      }),
    });

    expect(state).toEqual({
      kind: 'incompatible',
      summary: 'Less than three axon sections are present!',
      details: 'NEURON: Less than three axon sections are present!\n cADpyr[0].init()',
    });
  });

  it('separates a check that could not run from an incompatibility', () => {
    const state = deriveCompatibilityState({
      ...base,
      data: response({ status: 'check_failed', compatible: false, error: 'download timed out' }),
    });

    expect(state).toEqual({
      kind: 'check-failed',
      summary: 'download timed out',
      details: undefined,
    });
  });

  it('treats a failed request as a check that could not run, not an incompatibility', () => {
    expect(deriveCompatibilityState({ ...base, isError: true })).toEqual({ kind: 'check-failed' });
  });

  it('falls back to the boolean when the simulator predates status', () => {
    expect(deriveCompatibilityState({ ...base, data: response({ compatible: true }) })).toEqual({
      kind: 'compatible',
    });

    expect(
      deriveCompatibilityState({ ...base, data: response({ compatible: false }) })
    ).toMatchObject({ kind: 'incompatible' });
  });
});

describe('blocksBuild', () => {
  it('blocks while checking and on a genuine incompatibility', () => {
    expect(blocksBuild({ kind: 'checking' })).toBe(true);
    expect(blocksBuild({ kind: 'incompatible' })).toBe(true);
  });

  it('blocks when the check could not reach a verdict', () => {
    expect(blocksBuild({ kind: 'check-failed' })).toBe(true);
  });

  it('blocks while no verdict exists yet', () => {
    // Reachable with a complete selection, between the selection landing and the query
    // starting — the build must not flash enabled in that gap.
    expect(blocksBuild({ kind: 'idle' })).toBe(true);
  });

  it('unblocks only on a verified-compatible pair', () => {
    const states: CompatibilityState[] = [
      { kind: 'idle' },
      { kind: 'checking' },
      { kind: 'compatible' },
      { kind: 'incompatible' },
      { kind: 'check-failed' },
    ];

    expect(states.filter((state) => !blocksBuild(state))).toEqual([{ kind: 'compatible' }]);
  });
});
