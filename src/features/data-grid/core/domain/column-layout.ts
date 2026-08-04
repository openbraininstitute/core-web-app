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
