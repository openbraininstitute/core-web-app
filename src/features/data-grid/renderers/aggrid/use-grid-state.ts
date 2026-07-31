import { useSyncExternalStore } from 'react';

import type { GridController, IGridState } from '../../core';

/** Subscribe an AG-managed sub-component to the headless store. */
export function useGridState<Row>(controller: GridController<Row>): IGridState {
  return useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
    controller.store.getSnapshot
  );
}
