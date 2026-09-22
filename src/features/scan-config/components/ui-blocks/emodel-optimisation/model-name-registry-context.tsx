'use client';

import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

import type { ReactNode } from 'react';

/**
 * Template-scoped `id_str -> model name` registry for ion channel models.
 *
 * Parameter keys under `mechanism_regions.<choice>.parameters` are `${param}_${modelName}`, but the
 * code paths that remove a model (the Mechanism Selection master list, the Region Assignment
 * uncheck) only hold the model's `id_str`. Panels resolve names asynchronously and register the
 * id->name mapping here so the synchronous prune helpers can look a name up by id.
 *
 * The store is a ref owned by {@link ModelNameRegistryProvider}, so its lifetime matches that
 * provider (mounted in the scan-config template) and it is dropped when the template unmounts — no
 * module-level global, no dependence on TanStack cache GC.
 */
type ModelNameRegistry = {
  /** records resolved `id_str -> name` pairs for later lookup */
  registerModelNames: (pairs: Array<{ id: string; name?: string | null }>) => void;
  /** returns the registered name for an `id_str`, or `undefined` if unknown */
  getModelName: (idStr: string) => string | undefined;
};

const ModelNameRegistryContext = createContext<ModelNameRegistry | null>(null);

export function ModelNameRegistryProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<Map<string, string>>(new Map());

  const registerModelNames = useCallback((pairs: Array<{ id: string; name?: string | null }>) => {
    for (const { id, name } of pairs) {
      if (id && typeof name === 'string' && name.length > 0) {
        storeRef.current.set(id, name);
      }
    }
  }, []);

  const getModelName = useCallback((idStr: string) => storeRef.current.get(idStr), []);

  const value = useMemo(
    () => ({ registerModelNames, getModelName }),
    [registerModelNames, getModelName]
  );

  return (
    <ModelNameRegistryContext.Provider value={value}>{children}</ModelNameRegistryContext.Provider>
  );
}

/**
 * Access the template-scoped model-name registry. Returns a no-op registry when used outside a
 * provider, so components that render in both the emodel layout and elsewhere stay safe.
 */
export function useModelNameRegistry(): ModelNameRegistry {
  return useContext(ModelNameRegistryContext) ?? NOOP_REGISTRY;
}

const NOOP_REGISTRY: ModelNameRegistry = {
  registerModelNames: () => {},
  getModelName: () => undefined,
};
