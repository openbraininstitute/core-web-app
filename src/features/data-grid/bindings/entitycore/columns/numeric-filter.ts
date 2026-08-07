import { OperatorId } from '../../../core';

/** Operators offered by a numeric entitycore field: a bounded range, or one exact value. */
export const NUMERIC_FILTER_OPERATORS: string[] = [OperatorId.Range, OperatorId.NumberEq];
