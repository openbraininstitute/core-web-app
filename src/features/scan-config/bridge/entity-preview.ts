'use client';

import { atom, useAtomValue, useSetAtom } from 'jotai';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';

export type TScanConfigEntityPreview = {
  dataType: TExtendedEntitiesTypeDict;
  record: EntityCoreIdentifiableNamed;
};

export const scanConfigEntityPreviewAtom = atom<TScanConfigEntityPreview | null>(null);

export function useScanConfigEntityPreview() {
  return useAtomValue(scanConfigEntityPreviewAtom);
}

export function useSetScanConfigEntityPreview() {
  return useSetAtom(scanConfigEntityPreviewAtom);
}
