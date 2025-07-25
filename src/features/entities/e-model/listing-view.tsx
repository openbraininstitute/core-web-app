import { ReactNode, ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { resolveDataKey } from '@/utils/key-builder';
import { detailUrlBuilder } from '@/util/common';

import type { Props as ExploreSectionListingViewProps } from '@/components/explore-section/ExploreSectionListingView';
import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

const ExploreSectionListingView = dynamic(
  () => import('@/components/explore-section/ExploreSectionListingView'),
  {
    ssr: false,
  }
) as unknown as (props: ExploreSectionListingViewProps<IEModel>) => ReactElement | null;

export default function ListingView({
  dataType,
  dataScope,
  renderButton,
  virtualLabInfo,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: VirtualLabInfo;
  renderButton?: (props: RenderButtonProps<IEModel>) => ReactNode;
}) {
  const { push: navigate } = useRouter();

  const onCellClick = (basePath: string, record: IEModel) => {
    const exploreUrl = detailUrlBuilder(basePath, record);
    navigate(exploreUrl);
  };

  const entity = getEntityByLegacyType({ legacyType: dataType });
  const dataKey = resolveDataKey({
    section: 'explore',
    projectId: virtualLabInfo?.projectId,
    entity,
  });

  return (
    <ExploreSectionListingView
      {...{
        dataKey,
        dataType,
        dataScope,
        onCellClick,
        renderButton,
        virtualLabInfo,
        useBrainRegion: true,
        selectionType: 'checkbox',
      }}
    />
  );
}
