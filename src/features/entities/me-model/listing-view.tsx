import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { detailUrlBuilder } from '@/util/common';

import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { WorkspaceContext } from '@/types/common';

export default function ListingView({
  dataType,
  dataScope,
  virtualLabInfo,
  renderButton,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: WorkspaceContext;
  renderButton?: (props: RenderButtonProps<IMEModel>) => ReactNode;
}) {
  const { push: navigate } = useRouter();

  const onCellClick = (basePath: string, record: IMEModel) => {
    const exploreUrl = detailUrlBuilder(basePath, record);
    navigate(exploreUrl);
  };

  const dataKey = `${virtualLabInfo?.projectId ?? ''}/explore/${dataType}`;
  return (
    <ExploreSectionListingView<IMEModel>
      {...{
        dataKey,
        dataType,
        dataScope,
        onCellClick,
        renderButton,
        virtualLabInfo,
      }}
    />
  );
}
