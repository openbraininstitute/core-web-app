'use client';

import { useParams, useRouter } from 'next/navigation';

import type { IEModel } from '@/api/entitycore/types';
import { useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

export default function ICMRelatedArtifactEvents() {
  const ctx = useParams<{ virtualLabId?: string; projectId?: string }>();
  const router = useRouter();

  useSelectEntityClickEvent<IEModel>((event) => {
    if (!event.detail.data) return;

    const { id: entityId, type: dataType } = event.detail.data;
    const detailsUrl = resolveExploreDetailsPageUrl({ ctx, entityId, dataType });

    router.push(detailsUrl);
  });

  return null;
}
