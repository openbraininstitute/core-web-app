import { tryCatch } from '@/api/utils';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import {
  DiscoverQuery,
  type IDiscoverTutorialsList,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

import type { Metadata } from 'next';
import type { ServerSideComponentProp } from '@/types/common';

export async function generateMetadata({
  searchParams,
}: ServerSideComponentProp<null, { t: string }>): Promise<Metadata> {
  const { t: slug } = await searchParams;
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: discoverTutorialsList } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.quickAccessList(),
      queryFn: () => client.fetch<IDiscoverTutorialsList>(DiscoverQuery),
    })
  );

  const video =
    discoverTutorialsList?.tutorialOrder.find((item) => item.slug === slug) ??
    discoverTutorialsList?.tutorialOrder.at(0);

  const title = video?.title
    ? `${video.title} - Tutorials | Open Brain Institute`
    : 'Tutorials | Open Brain Institute';
  const description =
    video?.description ??
    'Watch tutorials to learn how to use the Open Brain Institute effectively.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'video.episode',
    },
  };
}

export default async function Page({ searchParams }: ServerSideComponentProp<null, { t: string }>) {
  const { t: slug } = await searchParams;
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: discoverTutorialsList } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.discoverTutorialsList(),
      queryFn: () => client.fetch<IDiscoverTutorialsList>(DiscoverQuery),
    })
  );

  const video =
    discoverTutorialsList?.tutorialOrder.find((item) => item.slug === slug) ??
    discoverTutorialsList?.tutorialOrder.at(0);

  return (
    <div className="relative w-full h-[522.19px] overflow-hidden rounded-xl">
      <VideoPlayer url={video?.url} />
    </div>
  );
}
