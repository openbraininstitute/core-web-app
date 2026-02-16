import { ActivityStatus } from '@/api/entitycore/types/shared/activity';

import type { Atom } from 'jotai';

export type Primitive = null | boolean | number | string;
export interface ConfigObject {
  [key: string]: Primitive | Primitive[] | ConfigObject;
}

export function isPlainObject(value: unknown): value is Record<string, ConfigObject> {
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

export function isAtom<T>(val: unknown): val is Atom<T> {
  return typeof val === 'object' && val !== null && 'read' in val;
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
