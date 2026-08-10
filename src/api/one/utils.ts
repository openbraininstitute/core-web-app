import { isString } from 'es-toolkit/compat';

import { authApiClient } from '@/api/api-client';
import { ApiError } from '@/api/error';
import { config } from '@/config';

export async function obioneApi(url?: string) {
  // @ts-expect-error: url is required and validated in the app build
  const api = await authApiClient(url ?? config.OBI_ONE_URL);
  return api;
}

export type TObiOneErrorBody = {
  detail?: unknown;
  error_code?: unknown;
  message?: unknown;
  details?: Array<{ msg?: unknown }> | null;
} | null;

/**
 * Pull the human-readable reason out of an obi-one error body.
 *
 * The service answers in two different shapes. FastAPI's `HTTPException` gives `{ detail }`,
 * while its own error envelope — used for rejected configs and for request validation failures —
 * gives `{ error_code, message, details }`, where the specific reason is in `details[0].msg` and
 * `message` may just be a generic "Validation error". Reading only one of the two is why a
 * rejected config surfaced as a bare "Unknown error".
 */
export function getObiOneErrorReason(body: TObiOneErrorBody): string {
  if (isString(body?.detail)) return body.detail;
  if (isString(body?.details?.[0]?.msg)) return body.details[0].msg;
  if (isString(body?.message)) return body.message;
  return 'Unknown error';
}

/** Rebuild the obi-one error body from the fields `parseApiError` lifted into the cause. */
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

/** Carries which step of campaign generation failed and the raw obi-one error body. */
export class ScanConfigGenerationError extends Error {
  readonly step: TScanConfigGenerationStep;

  readonly body: TObiOneErrorBody;

  constructor(step: TScanConfigGenerationStep, body: TObiOneErrorBody = null) {
    super(getObiOneErrorReason(body));
    this.name = 'ScanConfigGenerationError';
    this.step = step;
    this.body = body;
  }
}
