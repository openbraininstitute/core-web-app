import { env } from '@/env';
import { FlagDefinition } from '@/features/feature-flags/config';

// TODO: Feature is considered to be ready for prod, flag to be removed
export const unifiedSingleNeuronSimulationFlowFlag = {
  key: 'unifiedSingleNeuronSimulationFlow',
  defaultValue: true,
  description: 'Enable new single neuron unified (circuit) simulation flow with OBI-ONE',
  visible: ['local', 'development', 'staging'].includes(env.NEXT_PUBLIC_DEPLOYMENT_ENV),
} satisfies FlagDefinition;

export const flags = [unifiedSingleNeuronSimulationFlowFlag] as const satisfies FlagDefinition[];

export type FlagKey = (typeof flags)[number]['key'];

export const hasVisibleFlags = flags.some((flag) => flag.visible);

export type FeatureFlags = {
  [K in (typeof flags)[number]['key']]: boolean;
};
