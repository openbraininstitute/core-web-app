'use client';

import { atom } from 'jotai';

export type LeftPaneView =
  | 'about'
  | 'glossary'
  | 'terms'
  | 'guides'
  | 'features'
  | 'ai-tools'
  | 'pricing'
  | 'news'
  | null;

export const leftPaneViewAtom = atom<LeftPaneView>(null);
