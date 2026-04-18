import { ViewTransition } from 'react';

import { tryCatch } from '@/api/utils';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { ScrollToTop } from '@/ui/segments/project/get-started/elements/scroll-to-top';
import { TutorialNotFound } from '@/ui/segments/project/get-started/elements/tutorial-not-found';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { type TTutorial, TutorialQuery } from '@/ui/segments/project/get-started/query';
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
      queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery),
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
      queryFn: () => client.fetch<Array<TTutorial>>(TutorialQuery),
    })
  );

  const video = tutorials?.find((item) => item.slug === slug);

  if (!video) {
    return <TutorialNotFound />;
  }

  return (
    <>
      <ScrollToTop />
      <ViewTransition enter="vt-slide-up-enter" exit="vt-slide-down-exit">
        <div className="flex w-full flex-col gap-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-neutral-2">
            <VideoPlayer url={video?.url} />
          </div>
          <div className="flex flex-col gap-2 px-1">
            <h3 className="text-primary-9 text-xl font-bold line-clamp-2" title={video.title}>
              {video.title}
            </h3>
            <p className="text-neutral-4 line-clamp-5 text-sm leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
              exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
              dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
            </p>
          </div>
        </div>
      </ViewTransition>
    </>
  );
}
