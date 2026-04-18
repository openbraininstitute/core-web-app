'use client';

import { atom } from 'jotai';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export type ExamplePreview = {
  kind: 'data' | 'notebook';
  entityId: string;
  extendedType: TExtendedEntitiesTypeDict;
  title: string;
  thumbnail: string | null | undefined;
  // notebook-only:
  assetPath?: string;
  computeCell?: string;
};

// kept export name for back-compat; holds the currently previewed example card
export const dataPreviewAtom = atom<ExamplePreview | null>(null);
