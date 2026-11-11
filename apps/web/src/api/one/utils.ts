import { isString } from 'es-toolkit/compat';

import { authApiClient } from '@/api/api-client';
import { ApiError } from '@/api/error';
import { config } from '@/config';

export async function obioneApi(url?: string) {
  // @ts-expect-error: url is required and validated in the app build
  const api = await authApiClient(url ?? config.OBI_ONE_URL);
  return api;
}

/**
 * Normalized obi-one error payload.
 *
 * Supports FastAPI `{ detail }` and the envelope `{ error_code, message, details }`.
 */
export type TObiOneErrorBody = {
  detail?: unknown;
  error_code?: unknown;
  message?: unknown;
  details?: Array<{ msg?: unknown }> | null;
} | null;

/**
 * Returns a human-readable reason from an obi-one error body.
 *
 * Preference order: `detail`, `details[0].msg`, then `message`.
 *
 * @param body - Parsed error body, or `null`.
 * @returns Resolved reason string, or `"Unknown error"` when none is present.
 */
export function getObiOneErrorReason(body: TObiOneErrorBody): string {
  if (isString(body?.detail)) return body.detail;
  if (isString(body?.details?.[0]?.msg)) return body.details[0].msg;
  if (isString(body?.message)) return body.message;
  return 'Unknown error';
}

/**
 * Rebuilds an obi-one error body from fields lifted onto {@link ApiError.cause}.
 *
 * @param error - Caught value; only {@link ApiError} instances yield a body.
 * @returns Normalized body, or `null` when `error` is not an {@link ApiError}.
 */
export function toObiOneErrorBody(error: unknown): TObiOneErrorBody {
  if (!(error instanceof ApiError)) return null;
  const { detail, code, message, details } = error.cause ?? {};
  return { detail, error_code: code, message, details };
}

export const ScanConfigGenerationStep = {
  CoordinateCount: 'coordinate-count',
  Generation: 'generation',
  EmptyCampaignId: 'empty-campaign-id',
} as const;

export type TScanConfigGenerationStep =
  (typeof ScanConfigGenerationStep)[keyof typeof ScanConfigGenerationStep];

/**
 * Error raised when scan-config campaign generation fails.
 *
 * @property step - Failing generation step.
 * @property body - Raw obi-one error body for the step, when available.
 */
export class ScanConfigGenerationError extends Error {
  readonly step: TScanConfigGenerationStep;

  readonly body: TObiOneErrorBody;

  /**
   * @param step - Failing generation step.
   * @param body - Optional obi-one error body used to build `message`.
   */
  constructor(step: TScanConfigGenerationStep, body: TObiOneErrorBody = null) {
    super(getObiOneErrorReason(body));
    this.name = 'ScanConfigGenerationError';
    this.step = step;
    this.body = body;
  }
}
