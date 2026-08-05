import { useSyncExternalStore } from 'react';

import type { GridController, IGridState } from '@/features/data-grid/core';

/** Subscribe a React component to the headless grid store. */
export function useGridState<Row>(controller: GridController<Row>): IGridState {
  return useSyncExternalStore(
    controller.store.subscribe,
    controller.store.getSnapshot,
    controller.store.getSnapshot
  );
}
