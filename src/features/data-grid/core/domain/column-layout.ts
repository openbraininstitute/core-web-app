/**
 * Reconciliation of a PERSISTED column layout against the columns a schema
 * actually declares right now.
 *
 * The stored layout (`columnOrder` / `hiddenColumns`, see the local persistence
 * slice) is a snapshot of the columns that existed WHEN THE USER SAVED IT. A
 * schema change — a new column, a renamed one, a contextual `available` gate that
 * drops one — makes that snapshot partial. Every consumer therefore has to answer
 * the same question: what does the stored layout say about an id it never mentions?
 *
 * The answer is always "nothing" — the schema's declaration wins for that id — and
 * these helpers are the single place that rule is implemented.
 */

/**
 * Merge the declared column order with a persisted one.
 *
 * - ids present in BOTH keep the STORED relative order (the user's drag wins);
 * - ids only in the stored order are dropped (the column no longer exists);
 * - ids only in the declaration are inserted at their DECLARED slot, i.e. right
 *   after their nearest already-placed left neighbour (falling back to just before
 *   their nearest placed right neighbour when they lead the list).
 *
 * The last rule is the point: a naive `indexOf`-with-a-sentinel sort appends every
 * unknown id, so a column absent from the stored order renders LAST instead of
 * where its schema puts it.
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

    // slot it after the nearest DECLARED left neighbour that is already placed…
    let at = -1;
    for (let j = i - 1; j >= 0; j -= 1) {
      const k = result.indexOf(declaredIds[j]);
      if (k !== -1) {
        at = k + 1;
        break;
      }
    }
    // …otherwise before the nearest placed right neighbour (it leads the list)
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

/** The visibility default a column resolves to in the current context. */
export interface IColumnVisibilityDefault {
  id: string;
  /** `hiddenByDefault` resolved against the context (see `resolveColumns`). */
  hiddenByDefaultResolved: boolean;
}

/** The persisted local layout slice, as loaded — both fields may be absent. */
export interface IStoredColumnLayout {
  hiddenColumns?: ReadonlyArray<string> | null;
  /**
   * The stored `columnOrder`. It doubles as the set of columns the saved layout
   * KNOWS ABOUT: it is always written as a COMPLETE list of the columns that
   * existed at save time (the initial state writes every resolved id; a drag writes
   * AG Grid's full column state, hidden columns included), and it is written to the
   * same storage slice, in the same pass, as `hiddenColumns`.
   */
  columnOrder?: ReadonlyArray<string> | null;
}

/**
 * Merge the declared per-column `hiddenByDefault` with a persisted visibility list.
 *
 * The stored `hiddenColumns` is a FULL SNAPSHOT — the chooser rewrites it as "every
 * resolved column the user did not tick" — but only over the columns that existed
 * when it was written. So absence from the list means "the user left this visible"
 * ONLY for an id the snapshot knew about; for an id it never saw, absence means
 * nothing at all and the schema's `hiddenByDefault` decides.
 *
 * Without that distinction a newly-declared `hiddenByDefault: true` column would be
 * VISIBLE for every user with saved state and hidden for everyone else. Merging
 * naively the other way (union the stored list with the defaults) would instead
 * resurrect a column the user deliberately un-hid, on every schema change.
 *
 * "Known at save time" is read off the stored `columnOrder` (see
 * {@link IStoredColumnLayout.columnOrder}), so no extra persisted field is needed
 * and a column the user deliberately hid stays hidden across schema changes.
 */
export function reconcileHiddenColumns(
  columns: ReadonlyArray<IColumnVisibilityDefault>,
  stored: IStoredColumnLayout | null | undefined
): string[] {
  const storedHidden = stored?.hiddenColumns;
  if (!storedHidden) return columns.filter((c) => c.hiddenByDefaultResolved).map((c) => c.id);

  const hidden = new Set(storedHidden);
  // No stored order (the two are written together, so this is defensive): treat only
  // the hidden ids as known, leaving every other column on its declared default.
  const known = new Set(stored?.columnOrder ?? storedHidden);

  return columns
    .filter((c) => {
      if (hidden.has(c.id)) return true;
      return known.has(c.id) ? false : c.hiddenByDefaultResolved;
    })
    .map((c) => c.id);
}
