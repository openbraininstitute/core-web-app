'use client';

import { createContext, type PropsWithChildren, useRef } from 'react';

import type { Atom } from 'jotai';

const newMap = () => new Map<string, Atom<any>>();
const AtomContext = createContext(newMap());

export function AtomProvider({ children }: PropsWithChildren) {
  const atoms = useRef(newMap()).current;

  return <AtomContext.Provider value={atoms}>{children}</AtomContext.Provider>;
}
