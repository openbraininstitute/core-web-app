import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { RenderButtonProps } from './ExploreSectionListingView/useRowSelection';
import { OnCellClick } from './ExploreSectionListingView/ExploreSectionTable';
import { detailUrlBuilder } from '@/util/common';
import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';

// TODO: Delete this component, use useExploreTableOnClickHandler hook (src/hooks/virtual-labs) for shared logic
export default function WithExploreExperiment({
  dataType,
  dataScope,
  renderButton,
  virtualLabInfo,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  renderButton?: (props: RenderButtonProps) => ReactNode;
  virtualLabInfo?: VirtualLabInfo;
}) {
  const router = useRouter();
  const onCellClick: OnCellClick = (basePath, record) => {
    router.push(detailUrlBuilder(basePath, record));
  };

  return (
    <ExploreSectionListingView
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
