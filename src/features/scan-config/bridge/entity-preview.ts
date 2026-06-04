'use client';

import { useQuery } from '@tanstack/react-query';
import { atom, useAtomValue, useSetAtom } from 'jotai';

import { retrieveEntities } from '@/entity-configuration/domain/requests';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';

/**
 * `id` + `dataType` are always required (the stable identity). `record` is
 * optional: pass it when you already have the resolved entity to skip a fetch,
 * or omit it and `usePreviewRecord` resolves it from the domain config by id
 */
export type TScanConfigEntityPreview = {
  dataType: TExtendedEntitiesTypeDict;
  id: string;
  record?: EntityCoreIdentifiableNamed;
};

export const scanConfigEntityPreviewAtom = atom<TScanConfigEntityPreview | null>(null);

export function useScanConfigEntityPreview() {
  return useAtomValue(scanConfigEntityPreviewAtom);
}

export function useSetScanConfigEntityPreview() {
  return useSetAtom(scanConfigEntityPreviewAtom);
}

export function usePreviewRecord() {
  const preview = useAtomValue(scanConfigEntityPreviewAtom);
  const { virtualLabId, projectId } = useWorkspace();
  const context = { virtualLabId, projectId };

  const needsFetch = Boolean(preview && !preview.record);

  const { data, isLoading: isFetchingRecord } = useQuery({
    queryKey: keyBuilder.entities({
      context,
      type: preview?.dataType,
      filters: { id__in: preview ? [preview.id] : [] },
      withFacets: false,
    }),
    queryFn: () =>
      preview ? retrieveEntities({ type: preview.dataType, ids: [preview.id], ctx: context }) : [],
    enabled: needsFetch,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const record = preview?.record ?? data?.[0] ?? null;

  return {
    preview,
    record,
    dataType: preview?.dataType ?? null,
    isLoading: needsFetch && isFetchingRecord && !record,
  };
}
