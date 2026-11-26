'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getClient } from '@/services/sanity/client';
import {
  ProjectHomeGetStartedQuery,
  type TProjectHomeData,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

import { CHAPTERS } from './chapters';
import { WalkthroughStage } from './stage';
import { Walkthrough } from './walkthrough';

import type { TWalkthroughVideos } from './stage';

/**
 * The walkthrough of the platform: its models, from one neuron to a whole brain, the course on
 * modeling one, and its workflows and notebooks.
 */
export function WalkthroughPage() {
  const client = getClient();
  const { data: home } = useQuery({
    queryKey: keyBuilderExternal.projectHomeGetStarted(),
    queryFn: () =>
      client.fetch<TProjectHomeData>(ProjectHomeGetStartedQuery, {}, { next: { revalidate: 0 } }),
  });
  // The home's animations, as the old home showed them, by the section each introduces.
  const videos = useMemo((): TWalkthroughVideos => {
    const cards = home?.getStarted ?? [];
    const of = (section: string) =>
      cards.find((card) => card.title === section && card.thumbnailType === 'video')?.video ?? null;
    return { workflows: of('Workflows'), notebooks: of('Notebooks') };
  }, [home]);

  return (
    <Walkthrough
      chapters={CHAPTERS}
      stage={(chapter, colorSlot) => (
        <WalkthroughStage chapter={chapter} colorSlot={colorSlot} videos={videos} />
      )}
    />
  );
}
