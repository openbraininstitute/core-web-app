'use client';

import { ReactNode } from 'react';

import { RenderButtonProps } from './ExploreSectionListingView/useRowSelection';
import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import HydrateWrapper from '@/wrappers/hydrate-wrapper';

import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { EntityCoreIdentifiable } from '@/api/entitycore/types/shared/global';
import { useExploreTableOnClickHandler } from '@/hooks/virtual-labs';

export default function WithExploreExperiment<T extends EntityCoreIdentifiable>({
  dataType,
  dataScope,
  renderButton,
  virtualLabInfo,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  renderButton?: (props: RenderButtonProps<T>) => ReactNode;
  virtualLabInfo?: VirtualLabInfo;
}) {
  const onCellClick = useExploreTableOnClickHandler<T>();
  return (
    <HydrateWrapper>
      <ExploreSectionListingView<T>
        {...{
          dataType,
          dataScope,
          onCellClick,
          renderButton,
          virtualLabInfo,
          dataKey: (virtualLabInfo?.projectId ?? '') + 'explore' + dataType,
        }}
      />
    </HydrateWrapper>
  );
}
