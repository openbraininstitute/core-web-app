import { Atom } from 'jotai';
import uniq from 'lodash/uniq';
import { CircuitSimulationExecutionStatus } from '@/api/entitycore/types/entities/circuit-simulation-execution';

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
  assets: {
    order: 0,
    category: 'Assets',
  },
  morphology: {
    order: 1,
    category: 'Setup',
  },
  contribution: {
    order: 2,
    category: 'Contribution',
  },
  subject: {
    order: 4,
    category: 'Subject',
  },
  license: {
    order: 5,
    category: 'License',
  },
  mtype: {
    order: 6,
    category: 'Mtype',
  },
  // publication: {
  //  order: 7,
  // category: 'Publication',
  // },
  // scientificartifact: {
  //  order: 8,
  //  category: 'Scientific Artifact',
  // },
};

export const CATEGORIES: string[] = uniq(Object.values(ORDERING).map((o) => o.category));

const simExecStatusListordered = [
  CircuitSimulationExecutionStatus.CREATED,
  CircuitSimulationExecutionStatus.PENDING,
  CircuitSimulationExecutionStatus.RUNNING,
  CircuitSimulationExecutionStatus.DONE,
  CircuitSimulationExecutionStatus.ERROR,
];

export function getLatestSimExecStatus(
  remoteStatus: CircuitSimulationExecutionStatus,
  localStatus: CircuitSimulationExecutionStatus
) {
  const remoteStatusIdx = simExecStatusListordered.indexOf(remoteStatus);
  const localStatusIdx = simExecStatusListordered.indexOf(localStatus);

  const latestStatus = Math.max(remoteStatusIdx, localStatusIdx);

  return simExecStatusListordered[latestStatus];
}
