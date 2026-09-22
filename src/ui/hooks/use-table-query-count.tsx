'use client';

import { useAtomValue } from 'jotai';

import { WorkspaceSection } from '@/constants';
import { gridFilteredTotalAtom } from '@/features/data-grid/host/grid-total';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';

/**
 * Reads the filtered total the browse grid publishes for this listing, so the sidebar
 * count stays in sync with filters, search, sort and pagination. `undefined` when this
 * type is not the mounted listing — the caller falls back to its own count query.
 */
export function useTableQueryCount({
  extendedType,
  scope,
  workspace,
  isActiveEntity,
}: {
  extendedType: TExtendedEntitiesTypeDict;
  scope: TWorkspaceScope;
  workspace: WorkspaceContext;
  isActiveEntity: boolean;
}) {
  const { virtualLabId, projectId } = workspace;

  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section: WorkspaceSection.Data,
    dataType: extendedType,
    scope,
  });

  const gridTotal = useAtomValue(gridFilteredTotalAtom(dataKey));

  return { dataKey, count: isActiveEntity ? gridTotal : undefined };
}
