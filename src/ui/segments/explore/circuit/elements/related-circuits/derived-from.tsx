'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useMemo } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { activeColumnsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';
import { useExploreColumns } from '@/hooks/useExploreColumns';
import { BaseTable } from '@/ui/segments/data-table/table';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  data: ICircuit | undefined;
};

export function DerivedFrom({ data }: Props) {
  const { push: navigate } = useRouter();
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const cols = useExploreColumns<ICircuit>(
    undefined,
    undefined,
    [],
    ExtendedEntitiesTypeDict.Circuit
  );
  const activeColumns = useAtomValue(
    useMemo(
      () =>
        unwrap(
          activeColumnsAtom({
            dataType: ExtendedEntitiesTypeDict.Circuit,
            dataScope: ExploreDataScope.NoScope,
            brainRegionId: undefined,
            key: data?.id ?? '',
          })
        ),
      [data?.id]
    )
  );
  const columns = cols.filter(({ key }) => (activeColumns || []).includes(key as string));

  const onCellClick = (basePath: string, record: ICircuit) => {
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
