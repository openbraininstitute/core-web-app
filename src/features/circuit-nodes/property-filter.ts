import { ColumnKindDict } from './types';

import type { ColumnMeta, TOfferedProperties, TPropertyFilter } from './types';

/** The properties kept longest when a selection is said by its cells' values, the most telling first. */
const TELLING = [
  'mtype',
  'etype',
  'layer',
  'synapse_class',
  'morph_class',
  'cell_class',
  'super_class',
  'superclass',
  'class',
  'cell_type',
  'type',
  'region',
];
/** A property taking more of its values than this to say the selection reads as a list, not a description. */
const MOST_VALUES = 40;

/** Whether the form can show `property` with all of `values`; it drops blank values. */
export function canShow(
  offered: TOfferedProperties,
  property: string,
  values: readonly string[]
): boolean {
  const listed = Object.hasOwn(offered, property) ? offered[property] : undefined;
  return listed !== undefined && values.every((v) => v.trim() !== '' && listed.includes(v));
}

/** How a categorical column narrows to the selection: a flag per value of its library, and how many are on. */
type Narrowing = {
  name: string;
  library: string[];
  codes: Uint32Array;
  kept: Uint8Array;
  count: number;
};

/** The cells that every narrowing keeps, counted, stopping once past `limit`. */
function countKept(narrowings: readonly Narrowing[], rowCount: number, limit: number): number {
  let count = 0;
  for (let row = 0; row < rowCount; row++) {
    if (narrowings.every((n) => n.kept[n.codes[row]] === 1)) {
      count += 1;
      if (count > limit) return count;
    }
  }
  return count;
}

/** The offered values that pick out exactly `cells`, with as few properties as can; null where none do. */
export function propertyFilterOf({
  cells,
  rowCount,
  columns,
  offered,
  read,
}: {
  /** The cells on show, by node index, sorted. */
  cells: Uint32Array;
  rowCount: number;
  columns: readonly ColumnMeta[];
  offered: TOfferedProperties;
  read: (name: string) => { library: string[]; indices: Uint32Array };
}): TPropertyFilter | null {
  const narrowings: Narrowing[] = [];
  for (const meta of columns.filter(
    (c) => c.kind === ColumnKindDict.Categorical && Object.hasOwn(offered, c.name)
  )) {
    const values = read(meta.name);
    const kept = new Uint8Array(values.library.length);
    let count = 0;
    for (const cell of cells) {
      const code = values.indices[cell];
      if (kept[code] === 0) {
        kept[code] = 1;
        count += 1;
      }
    }
    // A property the cells take every value of says nothing; one they take most of, too much.
    const taken = values.library.filter((_, code) => kept[code] === 1);
    if (
      count < values.library.length &&
      count <= MOST_VALUES &&
      canShow(offered, meta.name, taken)
    ) {
      narrowings.push({
        name: meta.name,
        library: values.library,
        codes: values.indices,
        kept,
        count,
      });
    }
  }
  const exact = (kept: readonly Narrowing[]) =>
    kept.length > 0 && countKept(kept, rowCount, cells.length) === cells.length;
  if (!exact(narrowings)) return null;

  // The least telling are tried first: a property not among them, then theirs from the last.
  const rank = (name: string) => {
    const at = TELLING.indexOf(name);
    return at === -1 ? TELLING.length : at;
  };
  let kept = narrowings;
  for (const dropped of [...narrowings].sort((a, b) => rank(b.name) - rank(a.name))) {
    const without = kept.filter((n) => n !== dropped);
    if (exact(without)) kept = without;
  }
  return Object.fromEntries(
    kept.map((n) => [n.name, n.library.filter((_, code) => n.kept[code] === 1)])
  );
}
