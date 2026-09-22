import type { CompatibilityCheckResponse } from '@/api/small-scale-simulator/single-neuron/compatibility';
import type { ApiResponse } from '@/types/small-scale-simulator/common';

export type CompatibilityState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'compatible' }
  | { kind: 'incompatible' | 'check_failed'; detail?: string };

type CompatibilityQuery = {
  isFetching: boolean;
  isError: boolean;
  data?: ApiResponse<CompatibilityCheckResponse>;
};

export function deriveCompatibilityState(
  selectionComplete: boolean,
  { isFetching, isError, data }: CompatibilityQuery
): CompatibilityState {
  if (!selectionComplete) return { kind: 'idle' };
  if (isFetching) return { kind: 'checking' };
  if (isError) return { kind: 'check_failed' };

  const result = data?.data;
  if (!result) return { kind: 'idle' };

  // Older simulators don't return `status`.
  const status = result.status ?? (result.compatible ? 'compatible' : 'incompatible');
  if (status === 'compatible') return { kind: 'compatible' };

  return { kind: status, detail: result.details ?? result.error ?? undefined };
}
