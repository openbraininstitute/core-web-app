'use client';

import { useQuery } from '@tanstack/react-query';

import { getClient } from '@/services/sanity/client';
import {
  ProjectHomeGetStartedQuery,
  type TProjectHomeData,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

import { GetStartedCard, GetStartedCardSkeleton } from './get-started-card';
import { ObiAssistantBlock } from './obi-assistant-block';

function GetStartedCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {['skeleton-1', 'skeleton-2', 'skeleton-3'].map((id) => (
        <GetStartedCardSkeleton key={id} />
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
