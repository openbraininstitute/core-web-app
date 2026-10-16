import { obioneApi } from '@/api/one/utils';

/** Validation result for a distance-dependent distribution function. */
export type TDistanceFunctionValidation = {
  valid: boolean;
  error: string | null;
  /** Character offsets into the function string delimiting the offending span. */
  from: number;
  to: number;
};

type TValidateDistanceFunctionParams = {
  function: string;
  signal?: AbortSignal;
};

/**
 * Validate a distance function server-side (obi-one owns the authoritative safe-AST check).
 *
 * The function is the single source of truth for its parameters, so only the function string is
 * sent: any placeholder other than `{value}`, `{distance}`, `{step_begin}` and `{step_end}` is a
 * parameter the frontend reads straight from the text. The endpoint checks safety only.
 *
 * Returns whether it is valid plus an error message and the character span of the first problem,
 * for inline editor highlighting.
 */
export async function validateDistanceFunction({
  function: fn,
  signal,
}: TValidateDistanceFunctionParams): Promise<TDistanceFunctionValidation> {
  const api = await obioneApi();
  return api.post<TDistanceFunctionValidation>('/declared/distance-function/validate', {
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    body: { function: fn },
    signal,
  });
}
