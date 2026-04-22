'use client';

import { atom } from 'jotai';

export type LeftPaneView = 'about' | 'glossary' | null;

export const leftPaneViewAtom = atom<LeftPaneView>(null);
