'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import { useMemo } from 'react';

import useExploreColumns from '@/hooks/useExploreColumns';
import { BaseTable } from '@/components/explore-section/ExploreSectionListingView/ExploreSectionTable';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { activeColumnsAtom } from '@/state/explore-section/list-view-atoms';
import { ExploreDataScope } from '@/types/explore-section/application';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  data: ICircuit | undefined;
};

export function Parent({ data }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const { push: navigate } = useRouter();
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
      columns={columns}
      dataContext={{
        dataScope: ExploreDataScope.NoScope,
        virtualLabInfo: undefined,
        dataType: ExtendedEntitiesTypeDict.Circuit,
      }}
      onCellClick={onCellClick}
      dataSource={data ? [data] : []}
    />
  );
}
