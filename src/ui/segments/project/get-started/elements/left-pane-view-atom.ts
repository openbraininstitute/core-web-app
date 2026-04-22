'use client';

import { atom } from 'jotai';

export type LeftPaneView =
  | 'about'
  | 'glossary'
  | 'terms'
  | 'guides'
  | 'features'
  | 'ai-tools'
  | null;

export const leftPaneViewAtom = atom<LeftPaneView>(null);
