import { tryCatch } from '@/api/utils';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { DiscoverQuery, type TTutorial } from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

import type { Metadata } from 'next';
import type { ServerSideComponentProp } from '@/types/common';

export async function generateMetadata({
  params,
}: ServerSideComponentProp<{ slug: string }, null>): Promise<Metadata> {
  const { slug } = await params;
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: tutorials } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.quickAccessList(),
      queryFn: () => client.fetch<Array<TTutorial>>(DiscoverQuery),
    })
  );

  const video = tutorials?.find((item) => item.slug === slug) ?? tutorials?.at(0);

  const title = video?.title
    ? `${video.title} - Tutorials | Open Brain Institute`
    : 'Tutorials | Open Brain Institute';

  return {
    title,
    openGraph: {
      title,
      type: 'video.episode',
    },
  };
}

export default async function Page({ params }: ServerSideComponentProp<{ slug: string }, null>) {
  const { slug } = await params;
  const client = getClient();
  const queryClient = getQueryClient();

  const { data: tutorials } = await tryCatch(
    queryClient.fetchQuery({
      queryKey: keyBuilderExternal.quickAccessList(),
      queryFn: () => client.fetch<Array<TTutorial>>(DiscoverQuery),
    })
  );

  const video = tutorials?.find((item) => item.slug === slug);

  if (!video) {
    return <div>HIIIII</div>;
  }

  return (
    <div className="relative w-full h-[522.19px] overflow-hidden rounded-xl">
      <VideoPlayer url={video?.url} />
    </div>
  );
}
