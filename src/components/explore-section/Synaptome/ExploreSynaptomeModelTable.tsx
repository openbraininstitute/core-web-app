import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

import { OnCellClick } from '../ExploreSectionListingView/ExploreSectionTable';
import { RenderButtonProps } from '../ExploreSectionListingView/useRowSelection';

import { detailUrlBuilder } from '@/util/common';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';

export default function ExploreSynaptomeModelTable({
  dataType,
  dataScope,
  virtualLabInfo,
  renderButton,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: VirtualLabInfo;
  renderButton?: (props: RenderButtonProps) => ReactNode;
}) {
  const { push: navigate } = useRouter();

  const onCellClick: OnCellClick = (basePath, record) => {
    // const { org, project } = getOrgAndProjectFromProjectId(record._source.project['@id']);
    // const vlProjectUrl = generateVlProjectUrl(org, project);
    // const baseBuildUrl = `${vlProjectUrl}/explore/interactive/model/synaptome`;
    // const exploreUrl = detailUrlBuilder(baseBuildUrl, record);
    const exploreUrl = detailUrlBuilder(basePath, record);
    navigate(exploreUrl);
  };

  return (
    <ExploreSectionListingView
      {...{
        dataType,
        dataScope,
        onCellClick,
        virtualLabInfo,
        renderButton,
        dataKey: (virtualLabInfo?.projectId ?? '') + 'explore' + dataType,
      }}
    />
  );
}
