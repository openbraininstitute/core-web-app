'use client';

import { useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { WorkspaceContext } from '@/types/common';

import { backToListPathAtom } from '@/state/explore-section/detail-view-atoms';
import { generateVlProjectUrl } from '@/util/virtual-lab/urls';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export default function ListingView({ virtualLabId, projectId }: WorkspaceContext) {
  const setBackToListPath = useSetAtom(backToListPathAtom);
  const vlProjectUrl = generateVlProjectUrl(virtualLabId, projectId);

  useEffect(() => {
    setBackToListPath(
      resolveExploreDetailsPageUrl({
        ctx: { virtualLabId, projectId },
      })
    );
  }, [projectId, setBackToListPath, virtualLabId, vlProjectUrl]);

  return (
    <div className="relative w-full">
      <div className="text-3xl text-white">{virtualLabId || <span>No Virtual Lab ID</span>}</div>
      <div className="text-3xl text-white">{projectId || <span>No Project ID</span>}</div>
    </div>
  );
}
