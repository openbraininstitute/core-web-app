"use client";

import { ReactNode } from 'react';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { RenderButtonProps } from './ExploreSectionListingView/useRowSelection';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { EntityCoreBase } from '@/api/entitycore/types/shared/global';
import { useExploreTableOnClickHandler } from '@/hooks/virtual-labs';

export default function WithExploreExperiment<T extends EntityCoreBase>({
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
  );
}
