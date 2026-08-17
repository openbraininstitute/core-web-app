/**
 * Reconciliation of a persisted column layout against the columns a schema declares
 * now. The stored layout is a snapshot from save time; for an id it never mentions,
 * the schema's declaration wins.
 */

/**
 * Merge the declared column order with a persisted one.
 *
 * - ids present in BOTH keep the STORED relative order (the user's drag wins);
 * - ids only in the stored order are dropped (the column no longer exists);
 * - ids only in the declaration are inserted at their DECLARED slot, i.e. right
 *   after their nearest already-placed left neighbour (falling back to just before
 *   their nearest placed right neighbour when they lead the list). A naive
 *   `indexOf`-with-sentinel sort would instead append them all.
 *
 * @example
 * reconcileColumnOrder(['a', 'b', 'c', 'd'], ['a', 'c', 'd']) // ['a', 'b', 'c', 'd']
 * reconcileColumnOrder(['a', 'b'], ['b', 'a', 'gone'])        // ['b', 'a']
 */
export function reconcileColumnOrder(
  declaredIds: ReadonlyArray<string>,
  storedOrder: ReadonlyArray<string> | null | undefined
): string[] {
  if (!storedOrder?.length) return [...declaredIds];

  const declared = new Set(declaredIds);
  const placed = new Set<string>();
  const result: string[] = [];

  for (const id of storedOrder) {
    if (!declared.has(id) || placed.has(id)) continue;
    placed.add(id);
    result.push(id);
  }
  if (result.length === declared.size) return result;

  for (let i = 0; i < declaredIds.length; i += 1) {
    const id = declaredIds[i];
    if (placed.has(id)) continue;

    let at = -1;
    for (let j = i - 1; j >= 0; j -= 1) {
      const k = result.indexOf(declaredIds[j]);
      if (k !== -1) {
        at = k + 1;
        break;
      }
    }
    if (at === -1) {
      at = result.length;
      for (let j = i + 1; j < declaredIds.length; j += 1) {
        const k = result.indexOf(declaredIds[j]);
        if (k !== -1) {
          at = k;
          break;
        }
      }
    }

    result.splice(at, 0, id);
    placed.add(id);
  }

  return result;
}

/**
 * Strip every NON-MOVABLE column (`movable: false`) from a stored order, so
 * {@link reconcileColumnOrder} re-inserts it at its declared slot.
 *
 * AG Grid still reports a position for a pinned column when a neighbour is dragged
 * past it, and that gets persisted. Dropping the id at READ rather than WRITE time
 * also keeps the stored `columnOrder` a complete list of known columns, which
 * {@link reconcileHiddenColumns} depends on.
 */
export function dropPinnedColumns(
  columns: ReadonlyArray<{ id: string; movable?: boolean }>,
  storedOrder: ReadonlyArray<string> | null | undefined
): ReadonlyArray<string> | null | undefined {
  if (!storedOrder?.length) return storedOrder;
  const pinned = new Set(columns.filter((c) => c.movable === false).map((c) => c.id));
  return pinned.size === 0 ? storedOrder : storedOrder.filter((id) => !pinned.has(id));
}

/** The visibility default a column resolves to in the current context. */
export interface IColumnVisibilityDefault {
  id: string;
  /** `hiddenByDefault` resolved against the context (see `resolveColumns`). */
  hiddenByDefaultResolved: boolean;
  /** see {@link IColumnModel.alwaysVisible} — never hidden, whatever the stored layout says. */
  alwaysVisible?: boolean;
}

/** The persisted local layout slice, as loaded — both fields may be absent. */
export interface IStoredColumnLayout {
  hiddenColumns?: ReadonlyArray<string> | null;
  /**
   * Doubles as the set of columns the saved layout knows about: always written as a
   * complete list of the columns existing at save time, in the same pass as
   * `hiddenColumns`.
   */
  columnOrder?: ReadonlyArray<string> | null;
}

/** The layout slice of {@link IGridState} — what the column chooser and drag/resize own. */
export interface IColumnLayout {
  columnOrder: string[];
  hiddenColumns: string[];
  columnWidths: Record<string, number>;
}

/** The layout a schema resolves to with nothing persisted. */
export function defaultColumnLayout(
  columns: ReadonlyArray<IColumnVisibilityDefault>
): IColumnLayout {
  return {
    columnOrder: columns.map((c) => c.id),
    hiddenColumns: columns
      .filter((c) => c.hiddenByDefaultResolved && !c.alwaysVisible)
      .map((c) => c.id),
    columnWidths: {},
  };
}

/** Whether a layout is already the schema's default, i.e. a reset would change nothing. */
export function isDefaultColumnLayout(
  columns: ReadonlyArray<IColumnVisibilityDefault>,
  layout: IColumnLayout
): boolean {
  const defaults = defaultColumnLayout(columns);
  const sameList = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) =>
    a.length === b.length && a.every((v, i) => v === b[i]);
  return (
    Object.keys(layout.columnWidths).length === 0 &&
    sameList(defaults.columnOrder, layout.columnOrder) &&
    sameList([...defaults.hiddenColumns].sort(), [...layout.hiddenColumns].sort())
  );
}

/**
 * Merge the declared per-column `hiddenByDefault` with a persisted visibility list.
 *
 * Absence from the stored `hiddenColumns` means "the user left this visible" only for
 * an id the snapshot knew about; for any other id the schema's `hiddenByDefault`
 * decides. Without that distinction a newly-declared `hiddenByDefault: true` column
 * would show up for every user with saved state. "Known at save time" is read off the
 * stored `columnOrder` (see {@link IStoredColumnLayout.columnOrder}).
 */
export function reconcileHiddenColumns(
  columns: ReadonlyArray<IColumnVisibilityDefault>,
  stored: IStoredColumnLayout | null | undefined
): string[] {
  const storedHidden = stored?.hiddenColumns;
  if (!storedHidden)
    return columns.filter((c) => c.hiddenByDefaultResolved && !c.alwaysVisible).map((c) => c.id);

  const hidden = new Set(storedHidden);
  // Defensive: the two are written together, so a missing order means only the
  // hidden ids count as known.
  const known = new Set(stored?.columnOrder ?? storedHidden);

  return columns
    .filter((c) => {
      // Repairs a layout saved before the column became `alwaysVisible`.
      if (c.alwaysVisible) return false;
      if (hidden.has(c.id)) return true;
      return known.has(c.id) ? false : c.hiddenByDefaultResolved;
    })
    .map((c) => c.id);
}
