import { getClient } from '@/services/sanity/client';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import {
  DiscoverQuery,
  type IDiscoverTutorialsList,
} from '@/ui/segments/project/get-started/query';

import type { ServerSideComponentProp } from '@/types/common';

export default async function Page({ searchParams }: ServerSideComponentProp<null, { t: string }>) {
  const { t: slug } = await searchParams;
  const client = getClient();
  const videos = await client.fetch<IDiscoverTutorialsList>(DiscoverQuery);
  const video =
    videos.tutorialOrder.find((item) => item.slug === slug) ?? videos.tutorialOrder.at(0);

  return (
    <section className="tutorials pr-2">
      <div className="relative w-full h-[522.19px] overflow-hidden rounded-xl">
        <VideoPlayer url={video?.url} />
      </div>
    </section>
  );
}
