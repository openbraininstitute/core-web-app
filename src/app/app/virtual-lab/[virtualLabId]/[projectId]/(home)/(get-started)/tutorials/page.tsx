import { PlayCircleOutlined } from '@ant-design/icons';
import { ViewTransition } from 'react';

import { tryCatch } from '@/api/utils';
import { getQueryClient } from '@/query-provider/server';
import { getClient } from '@/services/sanity/client';
import { VideoPlayer } from '@/ui/segments/project/get-started/elements/video-player';
import { type TTutorial, TutorialQuery } from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';
import { unlessWorkspaceNav } from '@/utils/workspace-view-transition';

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
    return (
      <ViewTransition
        enter={unlessWorkspaceNav('vt-slide-up-enter')}
        exit={unlessWorkspaceNav('vt-slide-down-exit')}
      >
        <div className="relative w-full h-[522.19px] overflow-hidden rounded-xl bg-primary-9 flex flex-col items-center justify-center text-center px-6">
          <div className="flex items-center justify-center size-20 rounded-full bg-white/10 mb-6">
            <PlayCircleOutlined className="text-white! text-4xl" />
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">
            Select a tutorial to get started
          </h2>
          <p className="text-white/90 text-sm max-w-md leading-relaxed">
            Choose a video from the list below to learn how to use the platform,
          </p>
          <p className="text-white/90 text-sm max-w-md leading-relaxed">
            Each tutorial walks you through a specific feature or workflow.
          </p>
        </div>
      </ViewTransition>
    );
  }

  return (
    <ViewTransition
      enter={unlessWorkspaceNav('vt-slide-up-enter')}
      exit={unlessWorkspaceNav('vt-slide-down-exit')}
    >
      <div className="relative w-full h-[522.19px] overflow-hidden rounded-xl">
        <VideoPlayer url={video?.url} />
      </div>
    </ViewTransition>
  );
}
