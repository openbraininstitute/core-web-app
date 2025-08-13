'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import kebabCase from 'lodash/kebabCase';
import snakeCase from 'lodash/snakeCase';
import compact from 'lodash/compact';

import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { pageNumberAtom, sortStateAtom } from '@/state/explore-section/list-view-atoms';
import { useQueryExtendedEntityType } from '@/ui/hooks/use-query-extended-entity-type';
import { coreActiveColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { PAGE_NUMBER } from '@/api/entitycore/types/extended-entity-type';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { MainTable } from '@/ui/segments/data-table';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { WorkspaceScope } from '@/ui/hooks/use-query-extended-entity-type';
import type { WorkspaceContext } from '@/types/common';
import type { KebabCase } from '@/utils/type';

export function Browse() {
  const searchParams = useSearchParams();
  const navigate = useRouter().push;
  const scope = searchParams.get('scope') as WorkspaceScope;
  const { type } = useParams<WorkspaceContext & { type: KebabCase<TExtendedEntitiesTypeDict> }>();
  const { virtualLabId, projectId } = useWorkspace();
  const dataKey = compact([virtualLabId, projectId, type, scope]).join('/');

  const setPageNumber = useSetAtom(pageNumberAtom(dataKey));
  const dataType = snakeCase(type) as TExtendedEntitiesTypeDict;
  const entity = getEntityByExtendedType({ type: dataType });
  const [sortState, setSortState] = useAtom(sortStateAtom({ key: dataKey }));

  const onSortChange = (newSortState: any) => {
    setPageNumber(PAGE_NUMBER);
    setSortState(newSortState);
  };

  const allColumns = useDataTableColumns<EntityCoreIdentifiableNamed>({
    dataType,
    sortState,
    setSortState: onSortChange,
  });

  const activeColumns = useAtomValue(coreActiveColumnsAtom({ dataType, key: dataKey }));
  const columns = allColumns.filter(({ key }) => (activeColumns || []).includes(key as string));

  const { data, error, isPlaceholderData, isFetching } = useQueryExtendedEntityType({
    ctx: {
      key: dataKey,
      workspaceScope: scope,
      extendedEntityType: snakeCase(type) as TExtendedEntitiesTypeDict,
    },
    workspace: { virtualLabId, projectId },
    queryFn: async ({ queryKey }) => {
      const [{ workspace, queryParameters }] = queryKey;
      return entity?.api?.query.list?.({
        withFacets: true,
        filters: { ...queryParameters },
        context: workspace,
      });
    },
  });

  const dataSource = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.data;
  const facets = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.facets;
  const pagination = (data as EntityCoreResponse<EntityCoreIdentifiableNamed>)?.pagination;

  const onCellClick = (_: string, record: EntityCoreIdentifiableNamed) => {
    navigate(
      `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/view/${kebabCase(record.type)}/${record.id}`
    );
  };

  if (error)
    return (
      <div>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </div>
    );

  return (
    <div className="h-full min-h-0 min-w-0 overflow-hidden">
      <MainTable<EntityCoreIdentifiableNamed>
        sticky={{ offsetHeader: 75.5 }}
        showLoadingState
        controlsVisible
        isLoading={isPlaceholderData && isFetching}
        dataScope={scope}
        dataSource={dataSource ?? []}
        dataType={dataType}
        virtualLabInfo={{ virtualLabId, projectId }}
        dataKey={dataKey}
        columns={columns}
        facets={facets}
        onCellClick={onCellClick}
        dataCount={{
          pagination,
          dataLength: dataSource?.length,
        }}
        cls={{
          table: '[&_.ant-table]:bg-neutral-1! [&_.ant-table-header_th]:bg-neutral-1!',
        }}
      />
    </div>
  );
}
