import { EntitySlugValue } from './entity-configuration/domain/slug';
import { env } from '@/env';

export function tempCheckCircuitInDev(type: string): EntitySlugValue {
  if (env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'development') {
    // eslint-disable-next-line no-param-reassign
    if (type.startsWith('circuit-dev')) type = 'circuit';
  }
  return type as unknown as EntitySlugValue;
}

export function tempIsCircuitInDev(): boolean {
  if (env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'development') {
    return true;
  }
  return false;
}
