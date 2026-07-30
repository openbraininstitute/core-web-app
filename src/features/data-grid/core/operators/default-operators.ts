import { OperatorRegistry } from './operator-registry';

import type { OperatorDef } from './operator-registry';

/** Stable operator ids. Bindings map these to transport-specific params. */
export const OperatorId = {
  Ilike: 'ilike',
  Contains: 'contains',
  Eq: 'eq',
  In: 'in',
  /**
   * Set membership, but serialized with a SINGLE-underscore `_in` separator instead
   * of the usual `__in`. Semantically identical to {@link OperatorId.In}; exists only
   * because a few entitycore relation filters are spelled that way on the backend
   * (currently `post_region__name_in` on synapses-per-connection). Prefer `In`.
   */
  InSingleUnderscore: 'inSingleUnderscore',
  NotIn: 'notIn',
  Gte: 'gte',
  Lte: 'lte',
  Range: 'range',
  DateRange: 'dateRange',
  Bool: 'bool',
} as const;

export type TOperatorId = (typeof OperatorId)[keyof typeof OperatorId];

export const DEFAULT_OPERATORS: ReadonlyArray<OperatorDef> = [
  { id: OperatorId.Ilike, label: 'Contains', uiKind: 'text', valueKind: 'text' },
  {
    id: OperatorId.Contains,
    label: 'Contains (case-sensitive)',
    uiKind: 'text',
    valueKind: 'text',
  },
  { id: OperatorId.Eq, label: 'Equals', uiKind: 'text', valueKind: 'text' },
  { id: OperatorId.In, label: 'Is any of', uiKind: 'set', valueKind: 'set' },
  { id: OperatorId.InSingleUnderscore, label: 'Is any of', uiKind: 'set', valueKind: 'set' },
  { id: OperatorId.NotIn, label: 'Is none of', uiKind: 'set', valueKind: 'set' },
  { id: OperatorId.Gte, label: 'From', uiKind: 'number', valueKind: 'number' },
  { id: OperatorId.Lte, label: 'To', uiKind: 'number', valueKind: 'number' },
  { id: OperatorId.Range, label: 'Between', uiKind: 'range', valueKind: 'range' },
  { id: OperatorId.DateRange, label: 'Date range', uiKind: 'dateRange', valueKind: 'dateRange' },
  { id: OperatorId.Bool, label: 'Is', uiKind: 'boolean', valueKind: 'boolean' },
];

export function createDefaultOperatorRegistry(): OperatorRegistry {
  return new OperatorRegistry().registerMany(DEFAULT_OPERATORS);
}
