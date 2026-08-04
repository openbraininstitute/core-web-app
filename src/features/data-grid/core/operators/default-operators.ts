import { FilterValueKind } from '../domain/filter-model';
import { OperatorRegistry, OperatorUiKind } from './operator-registry';

import type { IOperatorDef } from './operator-registry';

/** Stable operator ids. Bindings map these to transport-specific params. */
export const OperatorId = {
  Ilike: 'ilike',
  Contains: 'contains',
  Eq: 'eq',
  In: 'in',
  /**
   * Identical to {@link OperatorId.In} but serialized with a single-underscore `_in`
   * separator, which a few entitycore relation filters require (e.g.
   * `post_region__name_in`). Prefer `In`.
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

export const DEFAULT_OPERATORS: ReadonlyArray<IOperatorDef> = [
  {
    id: OperatorId.Ilike,
    label: 'Contains',
    uiKind: OperatorUiKind.Text,
    valueKind: FilterValueKind.Text,
  },
  {
    id: OperatorId.Contains,
    label: 'Contains (case-sensitive)',
    uiKind: OperatorUiKind.Text,
    valueKind: FilterValueKind.Text,
  },
  {
    id: OperatorId.Eq,
    label: 'Equals',
    uiKind: OperatorUiKind.Text,
    valueKind: FilterValueKind.Text,
  },
  {
    id: OperatorId.In,
    label: 'Is any of',
    uiKind: OperatorUiKind.Set,
    valueKind: FilterValueKind.Set,
  },
  {
    id: OperatorId.InSingleUnderscore,
    label: 'Is any of',
    uiKind: OperatorUiKind.Set,
    valueKind: FilterValueKind.Set,
  },
  {
    id: OperatorId.NotIn,
    label: 'Is none of',
    uiKind: OperatorUiKind.Set,
    valueKind: FilterValueKind.Set,
  },
  {
    id: OperatorId.Gte,
    label: 'From',
    uiKind: OperatorUiKind.Number,
    valueKind: FilterValueKind.Number,
  },
  {
    id: OperatorId.Lte,
    label: 'To',
    uiKind: OperatorUiKind.Number,
    valueKind: FilterValueKind.Number,
  },
  {
    id: OperatorId.Range,
    label: 'Between',
    uiKind: OperatorUiKind.Range,
    valueKind: FilterValueKind.Range,
  },
  {
    id: OperatorId.DateRange,
    label: 'Date range',
    uiKind: OperatorUiKind.DateRange,
    valueKind: FilterValueKind.DateRange,
  },
  {
    id: OperatorId.Bool,
    label: 'Is',
    uiKind: OperatorUiKind.Boolean,
    valueKind: FilterValueKind.Boolean,
  },
];

export function createDefaultOperatorRegistry(): OperatorRegistry {
  return new OperatorRegistry().registerMany(DEFAULT_OPERATORS);
}
