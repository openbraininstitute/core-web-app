import { ReactElement, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import { getEntityByLegacyType } from '@/entity-configuration/domain/helpers';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { resolveDataKey } from '@/utils/key-builder';
import { detailUrlBuilder } from '@/util/common';

import type { Props as ExploreSectionListingViewProps } from '@/components/explore-section/ExploreSectionListingView';
import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { WorkspaceContext } from '@/types/common';

const ExploreSectionListingView = dynamic(
  () => import('@/components/explore-section/ExploreSectionListingView'),
  {
    ssr: false,
  }
) as (props: ExploreSectionListingViewProps<ISingleNeuronSynaptome>) => ReactElement | null;

export default function ExploreSynaptomeModelTable({
  dataType,
  dataScope,
  virtualLabInfo,
  renderButton,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: WorkspaceContext;
  renderButton?: (props: RenderButtonProps<ISingleNeuronSynaptome>) => ReactNode;
}) {
  const { push: navigate } = useRouter();

  const onCellClick = (basePath: string, record: ISingleNeuronSynaptome) => {
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
        dataType,
        dataScope,
        onCellClick,
        virtualLabInfo,
        renderButton,
        dataKey,
      }}
    />
  );
}
