import { messages } from '@/i18n/en/me-model';

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

// the simulator's check passes these, but they cannot be built with any morphology yet
const UNBUILDABLE_EMODEL_NAMES = new Set([
  'EM__CBXgr_GrC_cNAC',
  'EM__CBXmo_StC_cNAC',
  'EM__CBXpu_PuC_cNAC',
  'EM__CBXgr_GoC_cAC',
  'EM__MOBmi_MC_cNAC',
  'EM__MOBgr_sGC_dNAC',
]);

export function deriveCompatibilityState(
  selectionComplete: boolean,
  { isFetching, isError, data }: CompatibilityQuery,
  emodelName?: string
): CompatibilityState {
  if (!selectionComplete) return { kind: 'idle' };
  if (emodelName && UNBUILDABLE_EMODEL_NAMES.has(emodelName)) {
    return { kind: 'incompatible', detail: messages.UnbuildableEModel };
  }
  if (isFetching) return { kind: 'checking' };
  if (isError) return { kind: 'check_failed' };

  const result = data?.data;
  if (!result) return { kind: 'idle' };

  // Older simulators don't return `status`.
  const status = result.status ?? (result.compatible ? 'compatible' : 'incompatible');
  if (status === 'compatible') return { kind: 'compatible' };

  return { kind: status, detail: result.details ?? result.error ?? undefined };
}
