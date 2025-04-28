'use client';

import { useEffect, use } from 'react';
import { useSetAtom } from 'jotai';

import Nav from '@/components/build-section/virtual-lab/me-model/Nav';
import SummaryView from '@/page-wrappers/explore/me-model';

import { ModelTypeNames } from '@/constants/explore-section/data-types/model-data-types';
import { backToListPathAtom } from '@/state/explore-section/detail-view-atoms';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';

type Params = {
  params: Promise<{
    id: string;
    modelType: ModelTypeNames;
    projectId: string;
    virtualLabId: string;
  }>;
};

export default function MEModelViewPage(props: Params) {
  const params = use(props.params);
  const vlProjectUrl = generateVlProjectUrl(params.virtualLabId, params.projectId);
  const setBackToListPath = useSetAtom(backToListPathAtom);

  useEffect(() => {
    setBackToListPath(`${vlProjectUrl}/build`);
  }, [setBackToListPath, vlProjectUrl]);

  return (
    <div className="grid grid-cols-[min-content_auto] overflow-hidden bg-white">
      <Nav params={params} />
      <div className="secondary-scrollbar h-screen w-full overflow-y-auto">
        <SummaryView showViewMode params={params} />
      </div>
    </div>
  );
}
