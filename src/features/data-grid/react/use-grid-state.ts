import { useCallback, useSyncExternalStore } from 'react';

import type { GridController, IGridState } from '@/features/data-grid/core';

/** Subscribe a React component to the headless grid store. */
export function useGridState<Row>(controller: GridController<Row>): IGridState {
  return useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
    controller.store.getSnapshot
  );
}

/**
 * Subscribe to ONE slice of the grid store. Unlike {@link useGridState}, a component
 * using this re-renders only when the selected value changes, so a large host can read
 * a single field without waking on every selection/expansion/layout dispatch.
 *
 * `select` must return a primitive (or a stable reference): the subscription bails out
 * on `Object.is`.
 */
export function useGridStateSlice<Row, T>(
  controller: GridController<Row>,
  select: (state: IGridState) => T
): T {
  const read = useCallback(() => select(controller.store.getSnapshot()), [controller, select]);
  return useSyncExternalStore(controller.store.subscribe, read, read);
}
