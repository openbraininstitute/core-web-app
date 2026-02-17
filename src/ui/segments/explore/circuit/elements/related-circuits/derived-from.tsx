'use client';

import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope } from '@/constants';
import { activeColumnsAtom } from '@/ui/segments/data-table/elements/context';
import { useDataTableColumns } from '@/ui/segments/data-table/elements/use-data-table-columns';
import { BaseTable } from '@/ui/segments/data-table/table';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  data: ICircuit | undefined;
};

export function DerivedFrom({ data }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
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
      wrapperClassname="[&_.ant-table-body]:max-h-full!"
      columns={columns}
      dataType={ExtendedEntitiesTypeDict.Circuit}
      dataSource={data ? [data] : []}
      onCellClick={onCellClick}
    />
  );
}
