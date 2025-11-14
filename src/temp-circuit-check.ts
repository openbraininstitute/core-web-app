import { EntitySlugValue } from './entity-configuration/domain/slug';
import { getServerConfig } from '@/config';

const config = getServerConfig();

export function tempCheckCircuitInDev(type: string): EntitySlugValue {
  if (config.DEPLOYMENT_ENV === 'development') {
    // eslint-disable-next-line no-param-reassign
    if (type.startsWith('circuit-dev')) type = 'circuit';
  }
  return type as unknown as EntitySlugValue;
}

export function tempIsCircuitInDev(): boolean {
  if (config.DEPLOYMENT_ENV === 'development') {
    return true;
  }
  return false;
}
