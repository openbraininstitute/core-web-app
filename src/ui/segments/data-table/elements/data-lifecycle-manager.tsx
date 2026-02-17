'use client';

import { useCallback, useEffect, useRef } from 'react';

import { DataListStateSnapshotContext } from '@/ui/segments/data-table/elements/context';

import type { PropsWithChildren } from 'react';

/**
 * component that manages the lifecycle of data table atoms and session storage.
 * it provides a context for registering reset functions that will be called when the component unmounts.
 * this ensures that data-related state is cleared when the user navigates away from the data section.
 *
 * @param children children components that will have access to the reset registration context.
 */
export function DataListStateSnapshotLifecycleManager({ children }: PropsWithChildren) {
  const registry = useRef<Map<string, () => void>>(new Map());

  const register = useCallback((key: string, resetFn: () => void) => {
    if (!registry.current.has(key)) {
      registry.current.set(key, resetFn);
    }
  }, []);

  useEffect(() => {
    const currentRegistry = registry.current;
    return () => {
      currentRegistry.forEach((reset) => {
        reset();
      });
      currentRegistry.clear();
    };
  }, []);

  return (
    <DataListStateSnapshotContext.Provider value={register}>
      {children}
    </DataListStateSnapshotContext.Provider>
  );
}
