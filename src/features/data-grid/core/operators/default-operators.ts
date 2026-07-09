import { OperatorRegistry } from './operator-registry';

import type { OperatorDef } from './operator-registry';

/** Stable operator ids. Bindings map these to transport-specific params. */
export const OperatorId = {
  Ilike: 'ilike',
  Contains: 'contains',
  Eq: 'eq',
  In: 'in',
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
