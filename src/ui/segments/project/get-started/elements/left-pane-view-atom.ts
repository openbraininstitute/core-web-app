'use client';

import { atom } from 'jotai';

export type LeftPaneView = 'about' | 'glossary' | 'terms' | null;

export const leftPaneViewAtom = atom<LeftPaneView>(null);
