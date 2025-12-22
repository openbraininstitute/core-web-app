import { flags, FeatureFlags } from './flags';

export const FEATURE_FLAGS_COOKIE = 'feature-flags';
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export { defineFlag, type FlagDefinition } from './define-flag';

export const defaultFlags: FeatureFlags = flags.reduce((acc, flag) => {
  acc[flag.key as keyof FeatureFlags] = flag.defaultValue;
  return acc;
}, {} as FeatureFlags);

export type { FeatureFlags };
