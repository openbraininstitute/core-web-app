import type { ClientConfig } from '@/config';

export type TDeploymentEnv = ClientConfig['DEPLOYMENT_ENV'];

export type FlagDefinition<T = unknown> = {
  key: string;
  defaultValue: T;
  values: T[];
  labels?: string[];
  description?: string;
  visible?: boolean | (() => boolean);
  /** The only deployments where the flag can leave its default. Not set: all of them. */
  environments?: readonly TDeploymentEnv[];
};

export const defineFlag = <T>(definition: FlagDefinition<T>) => {
  if (definition.labels && definition.labels.length !== definition.values.length) {
    throw new Error(
      `Flag ${definition.key} has ${definition.labels.length} labels but ${definition.values.length} values`
    );
  }

  return definition;
};
