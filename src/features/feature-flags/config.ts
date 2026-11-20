import { config } from '@/config';

import { type FeatureFlags, flags } from './flags';

export const FEATURE_FLAGS_COOKIE = 'feature-flags';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export { defineFlag, type FlagDefinition } from './define-flag';

export const defaultFlags: FeatureFlags = flags.reduce((acc, flag) => {
  acc[flag.key as keyof FeatureFlags] = flag.defaultValue;
  return acc;
}, {} as FeatureFlags);

/** The defaults of the flags this deployment cannot change; they go over the cookie's values. */
export const lockedFlags = (): Partial<FeatureFlags> =>
  Object.fromEntries(
    flags
      .filter((flag) => flag.environments?.includes(config.DEPLOYMENT_ENV) === false)
      .map((flag) => [flag.key, flag.defaultValue])
  );

export type { FeatureFlags };
