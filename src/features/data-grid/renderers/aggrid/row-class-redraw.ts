import { useCallback, useEffect, useRef } from 'react';

import type { GridApi, IRowNode } from 'ag-grid-community';
import type { RefObject } from 'react';

/**
 * AG Grid only ever adds what `getRowClass` returns, so a row whose class changes must be
 * redrawn to drop the old one; that also refreshes cells reading row state beyond their
 * own value. Returns the check to run once the grid is ready and on every row data update.
 * Only rows whose class changed are redrawn: a redraw remounts their cells.
 */
export function useRowClassRedraw<T>(
  apiRef: RefObject<GridApi<T> | null>,
  classOf?: (data: T) => string | undefined
) {
  // rebuilt from the nodes each pass, so it holds only the rows the grid has now
  const seen = useRef(new Map<string, string | undefined>());

  const redraw = useCallback(() => {
    const api = apiRef.current;
    if (!api || api.isDestroyed() || !classOf) return;
    const changed: Array<IRowNode<T>> = [];
    const previous = seen.current;
    const current = new Map<string, string | undefined>();
    api.forEachNode((node) => {
      if (node.data == null || node.id == null) return;
      const next = classOf(node.data);
      if (previous.has(node.id) && previous.get(node.id) !== next) changed.push(node);
      current.set(node.id, next);
    });
    seen.current = current;
    if (changed.length) api.redrawRows({ rowNodes: changed });
  }, [apiRef, classOf]);

  // a new classOf (e.g. another view) changes classes without a data update
  useEffect(() => {
    redraw();
  }, [redraw]);

  return redraw;
}
