'use client';

import { notFound } from 'next/navigation';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { ExploreDataScope } from '@/types/explore-section/application';
import { useExploreTableOnClickHandler } from '@/hooks/virtual-labs';
import { DataType } from '@/constants/explore-section/list-views';
import { resolveDataKey } from '@/utils/key-builder';

import type { SerializedEntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  entity: SerializedEntityCoreTypeConfig<any>;
};

export default function ListingView({ entity, projectId, virtualLabId }: Props) {
  const onCellClick = useExploreTableOnClickHandler();

  if (!entity) notFound();

  const dataKey = resolveDataKey({ section: 'explore', projectId, entity });
  return (
    <ExploreSectionListingView
      dataType={entity.legacyType as DataType}
      dataScope={ExploreDataScope.SelectedBrainRegion}
      virtualLabInfo={{
        virtualLabId,
        projectId,
      }}
      dataKey={dataKey}
      onCellClick={onCellClick}
    />
  );
}
