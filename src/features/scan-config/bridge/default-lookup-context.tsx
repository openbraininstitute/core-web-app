'use client';

/**
 * A field whose default is looked up asynchronously after another field is picked is replaced by
 * a loading pill meanwhile, so it cannot be used half-resolved.
 *
 * The code that owns a lookup publishes it by field path (`usePublishDefaultLookup`) and the
 * generic field renderer only asks whether its own path is looking something up
 * (`useDefaultLookup`). State lives in the editor's provider, so editors never see each other's
 * lookups and the renderer needs no workflow knowledge.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type TDefaultLookupCopy = { title: string; detail?: string };

type TDefaultLookups = ReadonlyMap<string, TDefaultLookupCopy>;

type TDefaultLookupContext = {
  lookups: TDefaultLookups;
  setLookup: (fieldPath: string, copy: TDefaultLookupCopy | null) => void;
};

const DefaultLookupContext = createContext<TDefaultLookupContext | null>(null);

export function DefaultLookupProvider({ children }: { children: ReactNode }) {
  const [lookups, setLookups] = useState<TDefaultLookups>(() => new Map());

  // stable, so a publisher's effect does not re-run when the lookups change
  const setLookup = useCallback<TDefaultLookupContext['setLookup']>((fieldPath, copy) => {
    setLookups((previous) => {
      if (copy ? previous.get(fieldPath) === copy : !previous.has(fieldPath)) return previous;
      const next = new Map(previous);
      if (copy) next.set(fieldPath, copy);
      else next.delete(fieldPath);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ lookups, setLookup }), [lookups, setLookup]);

  return <DefaultLookupContext.Provider value={value}>{children}</DefaultLookupContext.Provider>;
}

/**
 * Marks `fieldPath` as looking up, with the pill's copy, while `copy` is set; cleared on change and
 * unmount. Pass a stable `copy` (module constant) so the effect does not re-run. Does nothing
 * outside a provider.
 */
export function usePublishDefaultLookup(fieldPath: string, copy: TDefaultLookupCopy | null) {
  const setLookup = useContext(DefaultLookupContext)?.setLookup;
  useEffect(() => {
    if (!setLookup || !copy) return;
    setLookup(fieldPath, copy);
    return () => setLookup(fieldPath, null);
  }, [setLookup, fieldPath, copy]);
}

/** The lookup in flight for `fieldPath`, if any; `undefined` outside a provider. */
export function useDefaultLookup(fieldPath: string | undefined): TDefaultLookupCopy | undefined {
  const lookups = useContext(DefaultLookupContext)?.lookups;
  return fieldPath ? lookups?.get(fieldPath) : undefined;
}
