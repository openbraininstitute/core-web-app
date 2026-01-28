import type { Atom } from 'jotai';

import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';

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
  EntitycoreExecutionStatus.CREATED,
  EntitycoreExecutionStatus.PENDING,
  EntitycoreExecutionStatus.RUNNING,
  EntitycoreExecutionStatus.DONE,
  EntitycoreExecutionStatus.ERROR,
];

export function getLatestSimExecStatus(
  remoteStatus: EntitycoreExecutionStatus,
  localStatus: EntitycoreExecutionStatus
) {
  const remoteStatusIdx = simExecStatusListOrdered.indexOf(remoteStatus);
  const localStatusIdx = simExecStatusListOrdered.indexOf(localStatus);

  const latestStatus = Math.max(remoteStatusIdx, localStatusIdx);

  return simExecStatusListOrdered[latestStatus];
}
