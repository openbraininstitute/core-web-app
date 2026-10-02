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
  /** Declared parameter names beyond {value}/{distance} the function may reference. */
  parameters?: readonly string[];
  signal?: AbortSignal;
};

/**
 * Validate a distance function server-side (obi-one owns the authoritative safe-AST check).
 *
 * Returns whether it is valid plus an error message and the character span of the first problem,
 * for inline editor highlighting.
 */
export async function validateDistanceFunction({
  function: fn,
  parameters = [],
  signal,
}: TValidateDistanceFunctionParams): Promise<TDistanceFunctionValidation> {
  const api = await obioneApi();
  return api.post<TDistanceFunctionValidation>('/declared/distance-function/validate', {
    headers: { accept: 'application/json', 'Content-Type': 'application/json' },
    body: { function: fn, parameters },
    signal,
  });
}
