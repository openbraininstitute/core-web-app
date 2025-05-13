import { CircuitSchemaProps, NumericFilterOptions } from '../type';

export function circuitMatchFilter(
  circuit: CircuitSchemaProps,
  filter: NumericFilterOptions | null,
  minValue: number | undefined,
  maxValue: number | undefined
): boolean {
  if (!filter) return true;

  const { property, type } = filter;
  const value = circuit[property] as number;

  if (type === 'greaterThan' && minValue !== undefined) {
    return value > minValue;
  }
  if (type === 'lessThan' && maxValue !== undefined) {
    return value < maxValue;
  }
  if (type === 'between' && minValue !== undefined && maxValue !== undefined) {
    return value >= minValue && value <= maxValue;
  }

  return true;
}
