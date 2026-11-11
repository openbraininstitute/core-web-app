// Client + server safe: the grading launch error reasons. No server-only imports here so client
// components (the project picker) can import these. User-facing copy lives in @/i18n/en/grading.

export const LAUNCH_ERROR_REASONS = [
  'invalid',
  'expired',
  'disabled',
  'notebook-service-failed',
  'insufficient-funds',
  'accounting-error',
  'jupyter-error',
  'no-project-access',
  'notebook-not-found',
] as const;

export type LaunchErrorReason = (typeof LAUNCH_ERROR_REASONS)[number];

export function isLaunchErrorReason(value: string | undefined): value is LaunchErrorReason {
  return typeof value === 'string' && (LAUNCH_ERROR_REASONS as readonly string[]).includes(value);
}
