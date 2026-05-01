'use client';

import { atom } from 'jotai';

export type LeftPaneView =
  | 'tutorials'
  | 'about'
  | 'glossary'
  | 'terms'
  | 'guides'
  | 'features'
  | 'ai-tools'
  | 'pricing'
  | 'news'
  | 'publications'
  | null;

export const leftPaneViewAtom = atom<LeftPaneView>(null);
