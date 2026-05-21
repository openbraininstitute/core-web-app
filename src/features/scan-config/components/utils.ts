import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import type { ConfigValue } from '../types';

export type Primitive = null | boolean | number | string;

export function isPlainObject(value: unknown): value is Record<string, ConfigValue> {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

const simExecStatusListOrdered = [
  ActivityStatus.CREATED,
  ActivityStatus.PENDING,
  ActivityStatus.RUNNING,
  ActivityStatus.DONE,
  ActivityStatus.ERROR,
];

export function getLatestSimExecStatus(remoteStatus: ActivityStatus, localStatus: ActivityStatus) {
  const remoteStatusIdx = simExecStatusListOrdered.indexOf(remoteStatus);
  const localStatusIdx = simExecStatusListOrdered.indexOf(localStatus);

  const latestStatus = Math.max(remoteStatusIdx, localStatusIdx);

  return simExecStatusListOrdered[latestStatus];
}

export const LEGACY_SIMULATION_ERROR_CODE = 'LEGACY_SIMULATION_ERROR';
export const SCAN_CONFIG_ERRORS = {
  [LEGACY_SIMULATION_ERROR_CODE]: {
    title: 'Configuration is not available',
    message: 'Configuration currently not viewable for historic simulations',
  },
};
