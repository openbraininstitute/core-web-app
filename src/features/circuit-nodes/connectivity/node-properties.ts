import type { NodeProperty } from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';

/** The most values a property's rows can be, or the matrix is too fine to read. */
export const MAX_GROUPS = 100;
/** The ranges a number's values are put in, where it takes more values than that. */
export const RANGES = 10;

/** A column of the node file, as a menu offers it to group the matrix by. */
export type NodeColumnOption = { name: string; ranges: boolean };

/**
 * The node file's columns the matrix can be grouped by: those with a value of a few
 * per neuron, and numbers, in ranges. Text columns (a morphology per neuron, say)
 * and the node id are left out, as is what the matrix has of its own.
 */
export function nodeColumnOptions(
  columns: readonly ColumnMeta[],
  own: ReadonlySet<string>
): NodeColumnOption[] {
  return columns.flatMap((column): NodeColumnOption[] => {
    // A node id's ranges are the neurons one by one, which the menu has already.
    if (
      own.has(column.name) ||
      column.name === 'node_id' ||
      column.name.startsWith('orientation_')
    ) {
      return [];
    }
    if (column.kind === 'categorical') {
      const values = column.library?.length ?? 0;
      return values > 0 && values <= MAX_GROUPS ? [{ name: column.name, ranges: false }] : [];
    }
    return column.kind === 'numeric' ? [{ name: column.name, ranges: true }] : [];
  });
}

function shortNumber(value: number): string {
  return Number(value.toPrecision(3)).toLocaleString();
}

/**
 * A column of the node file as a property of the neurons, a code per node id: its
 * categories, or for a number, its values where they are few, else equal ranges of
 * them, kept in order. A neuron with no value has code -1.
 */
export function nodeProperty(name: string, column: ColumnValues): NodeProperty {
  if (column.kind === 'categorical') {
    return { name, library: column.library, codes: Int32Array.from(column.indices) };
  }
  if (column.kind === 'string') {
    const index = new Map<string, number>();
    const codes = Int32Array.from(column.values, (value) => {
      let code = index.get(value);
      if (code === undefined) {
        code = index.size;
        index.set(value, code);
      }
      return code;
    });
    return { name, library: [...index.keys()], codes };
  }

  const values = column.values;
  const distinct = new Set<number>();
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const v = Number(value);
    if (!Number.isFinite(v)) continue;
    if (distinct.size <= RANGES) distinct.add(v);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (distinct.size <= RANGES) {
    const sorted = [...distinct].sort((a, b) => a - b);
    const codeOf = new Map(sorted.map((v, code) => [v, code]));
    return {
      name,
      library: sorted.map(shortNumber),
      codes: Int32Array.from(values, (value) => codeOf.get(Number(value)) ?? -1),
      ordered: true,
    };
  }
  const width = (max - min) / RANGES;
  const library = Array.from(
    { length: RANGES },
    // "to" rather than a dash, which reads as a minus beside a negative number.
    (_, k) => `${shortNumber(min + k * width)} to ${shortNumber(min + (k + 1) * width)}`
  );
  const codes = Int32Array.from(values, (value) => {
    const v = Number(value);
    if (!Number.isFinite(v)) return -1;
    return Math.min(RANGES - 1, Math.floor((v - min) / width));
  });
  return { name, library, codes, ordered: true };
}
