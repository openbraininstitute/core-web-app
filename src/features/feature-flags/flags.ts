import { env } from '@/env';
import { FlagDefinition } from './config';

export const flags = [
  {
    key: 'meModelObiOneSim',
    defaultValue: false,
    description: 'Enable new ME-model simulation flow with OBI-ONE integration',
    visible: ['local', 'development'].includes(env.NEXT_PUBLIC_DEPLOYMENT_ENV),
  },
] satisfies FlagDefinition[];

export const hasVisibleFlags = flags.some((flag) => flag.visible);

export type FeatureFlags = {
  [K in (typeof flags)[number]['key']]: boolean;
};
