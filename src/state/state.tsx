'use client';

import type { Atom } from 'jotai';
import { createContext, type PropsWithChildren, useRef } from 'react';

const newMap = () => new Map<string, Atom<any>>();
const AtomContext = createContext(newMap());

export function AtomProvider({ children }: PropsWithChildren) {
  const atoms = useRef(newMap()).current;

  return <AtomContext.Provider value={atoms}>{children}</AtomContext.Provider>;
}
