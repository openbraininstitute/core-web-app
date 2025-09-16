'use client';

import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import dynamic from 'next/dynamic';

import { ExploreDataScope } from '@/types/explore-section/application';
import { useExploreTableOnClickHandler } from '@/hooks/virtual-labs';
import { DataType } from '@/constants/explore-section/list-views';
import { resolveDataKey } from '@/utils/key-builder';

import type { Props as ExploreSectionListingViewProps } from '@/components/explore-section/ExploreSectionListingView';
import type { SerializedEntityCoreTypeConfig } from '@/entity-configuration/domain/types';
import type { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

type Props = WorkspaceContext & {
  entity: SerializedEntityCoreTypeConfig<any>;
};

const ExploreSectionListingView = dynamic(
  () => import('@/components/explore-section/ExploreSectionListingView'),
  {
    ssr: false,
  }
) as (props: ExploreSectionListingViewProps<EntityCoreIdentifiable>) => ReactElement | null;

export default function ListingView({ entity, projectId, virtualLabId }: Props) {
  const onCellClick = useExploreTableOnClickHandler();

  if (!entity) notFound();

  const dataKey = resolveDataKey({ section: 'explore', projectId, entity });
  return (
    <ExploreSectionListingView
      useBrainRegion
      dataType={entity.legacyType as DataType}
      dataScope={ExploreDataScope.SelectedBrainRegion}
      virtualLabInfo={{
        virtualLabId,
        projectId,
      }}
      dataKey={dataKey}
      selectionType="checkbox"
      onCellClick={onCellClick}
    />
  );
}
