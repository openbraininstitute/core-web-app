import type { CompatibilityCheckResponse } from '@/api/small-scale-simulator/single-neuron/compatibility';
import type { ApiResponse } from '@/types/small-scale-simulator/common';

export type CompatibilityState =
  /** Selection is incomplete, so there is nothing to check yet. */
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'compatible' }
  /** NEURON refused the model: the two components genuinely do not go together. */
  | { kind: 'incompatible'; summary?: string; details?: string }
  /** The check could not run. Says nothing about the models — offer a retry. */
  | { kind: 'check-failed'; summary?: string; details?: string };

type DeriveArgs = {
  selectionComplete: boolean;
  isFetching: boolean;
  isError: boolean;
  data?: ApiResponse<CompatibilityCheckResponse>;
};

export function deriveCompatibilityState({
  selectionComplete,
  isFetching,
  isError,
  data,
}: DeriveArgs): CompatibilityState {
  if (!selectionComplete) return { kind: 'idle' };
  if (isFetching) return { kind: 'checking' };

  // The request never landed, so we have no verdict either way.
  if (isError) return { kind: 'check-failed' };

  const result = data?.data;
  if (!result) return { kind: 'idle' };

  // `status` is absent on a simulator predating the three-state result; fall back to
  // the boolean, which conflated "incompatible" with "we could not tell".
  const status = result.status ?? (result.compatible ? 'compatible' : 'incompatible');

  if (status === 'compatible') return { kind: 'compatible' };

  return {
    kind: status === 'check_failed' ? 'check-failed' : 'incompatible',
    summary: result.error ?? undefined,
    details: result.details ?? undefined,
  };
}

/**
 * Only a real incompatibility blocks the build. A check that could not run leaves the
 * button enabled with a warning — the check is advisory, and refusing to build because
 * the simulator is briefly unreachable is worse than letting the user proceed knowingly.
 */
export function blocksBuild(state: CompatibilityState): boolean {
  return state.kind === 'checking' || state.kind === 'incompatible';
}
