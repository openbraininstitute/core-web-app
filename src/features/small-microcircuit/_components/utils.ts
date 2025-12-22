import { Atom } from 'jotai';
import uniq from 'es-toolkit/compat/uniq';
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

export const ORDERING: Record<string, { order: number; category: string }> = {
  info: {
    order: 0,
    category: 'Setup',
  },
  initialize: {
    order: 1,
    category: 'Setup',
  },
  stimuli: {
    order: 2,
    category: 'Stimuli & Recordings',
  },
  recordings: {
    order: 3,
    category: 'Stimuli & Recordings',
  },
  neuron_sets: {
    order: 4,
    category: 'Circuit components',
  },
  timestamps: {
    order: 5,
    category: 'Events',
  },
  synaptic_manipulations: {
    order: 6,
    category: 'Circuit components',
  },
};

export const CATEGORIES: string[] = uniq(Object.values(ORDERING).map((o) => o.category));

const simExecStatusListordered = [
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
  const remoteStatusIdx = simExecStatusListordered.indexOf(remoteStatus);
  const localStatusIdx = simExecStatusListordered.indexOf(localStatus);

  const latestStatus = Math.max(remoteStatusIdx, localStatusIdx);

  return simExecStatusListordered[latestStatus];
}
