'use client';

import { useQuery } from '@tanstack/react-query';

import { getClient } from '@/services/sanity/client';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  ProjectHomeGetStartedQuery,
  type TProjectHomeData,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

import { GetStartedCard } from './get-started-card';
import { ObiAssistantBlock } from './obi-assistant-block';

function GetStartedCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {['skeleton-1', 'skeleton-2', 'skeleton-3'].map((id) => (
        <div key={id} className="flex flex-col gap-4 rounded-xl border border-neutral-300 p-5">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-[60px]" />
          <div className="flex flex-col">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function GetStartedCards() {
  const client = getClient();

  const { data, isLoading } = useQuery({
    queryKey: keyBuilderExternal.projectHomeGetStarted(),
    queryFn: () =>
      client.fetch<TProjectHomeData>(ProjectHomeGetStartedQuery, {}, { next: { revalidate: 0 } }),
    staleTime: 0,
  });

  if (isLoading) return <GetStartedCardsSkeleton />;

  const cards = data?.getStarted ?? [];
  const assistantTopics = data?.obiAssistant ?? [];

  return (
    <div className="flex flex-col gap-4">
      {cards.length > 0 && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <GetStartedCard key={card._key} card={card} />
          ))}
        </section>
      )}
      <ObiAssistantBlock topics={assistantTopics} />
    </div>
  );
}
