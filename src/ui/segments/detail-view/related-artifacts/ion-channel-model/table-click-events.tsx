'use client';

import { useParams, useRouter } from 'next/navigation';

import { useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IEModel, IIonChannelRecording } from '@/api/entitycore/types';

export function RelatedArtifactEvents() {
  const ctx = useParams<{ virtualLabId?: string; projectId?: string }>();
  const router = useRouter();

  useSelectEntityClickEvent<IEModel | IIonChannelRecording>((event) => {
    if (!event.detail.data) return;

    const { id: entityId, type: dataType } = event.detail.data;
    const detailsUrl = resolveExploreDetailsPageUrl({ ctx, entityId, dataType });

    router.push(detailsUrl);
  });

  return null;
}
