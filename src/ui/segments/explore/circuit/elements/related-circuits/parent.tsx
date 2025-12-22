'use client';

import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope } from '@/constants';
import type { WorkspaceContext } from '@/types/common';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { BaseTable } from '@/ui/segments/data-table/table';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

type Props = {
  data: ICircuit | undefined;
};

export function Parent({ data }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { push: navigate } = useRouter();

  const cols = useDataTableColumns<ICircuit>({
    dataType: ExtendedEntitiesTypeDict.Circuit,
    setSortState: undefined,
    sortState: undefined,
    initialColumns: [],
  });

  const activeColumns = useAtomValue(
    useMemo(
      () =>
        unwrap(
          activeColumnsAtom({
            dataType: ExtendedEntitiesTypeDict.Circuit,
            dataScope: WorkspaceScope.Custom,
            key: data?.id ?? '',
          })
        ),
      [data?.id]
    )
  );
  const columns = cols.filter(({ key }) => (activeColumns || []).includes(key as string));
  const onCellClick = (_basePath: string, record: ICircuit) => {
    navigate(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
        dataType: ExtendedEntitiesTypeDict.Circuit,
        entityId: record.id,
      })
    );
  };

  return (
    <BaseTable
      loading={false}
      columns={columns}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      onCellClick={onCellClick}
      dataSource={data ? [data] : []}
      wrapperClassname="[&_.ant-table-body]:max-h-full!"
    />
  );
}
