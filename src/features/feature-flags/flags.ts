import { env } from '@/env';
import { FlagDefinition } from '@/features/feature-flags/config';

export const inifiedSingleNeuronSimulationFlowFlag = {
  key: 'unifiedSingleNeuronSimulationFlow',
  defaultValue: false,
  description: 'Enable new single neuron unified (circuit) simulation flow with OBI-ONE',
  visible: ['local', 'development', 'staging'].includes(env.NEXT_PUBLIC_DEPLOYMENT_ENV),
} satisfies FlagDefinition;

export const flags = [inifiedSingleNeuronSimulationFlowFlag] as const satisfies FlagDefinition[];

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) => flag.visible);

export type FeatureFlags = {
  [K in (typeof flags)[number]['key']]: boolean;
};
