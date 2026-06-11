'use client';

import { RiArrowRightLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';

import { config } from '@/config';
import { getProductionClient } from '@/services/sanity/client';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import {
  ProjectHomeGetStartedQuery,
  type TObiAssistantTopic,
  type TProjectHomeData,
  type TProjectHomeGetStartedCard,
} from '@/ui/segments/project/get-started/query';
import { keyBuilder as keyBuilderExternal } from '@/ui/use-query-keys/third-parties';

function CardMedia({ card }: { card: TProjectHomeGetStartedCard }) {
  if (card.thumbnailType === 'video' && card.video) {
    return (
      <video
        src={card.video}
        autoPlay
        muted
        loop
        playsInline
        className="h-full w-full rounded-lg object-cover"
      />
    );
  }

  if (card.image) {
    return (
      <Image
        src={card.image.url}
        alt={card.title}
        width={card.image.width}
        height={card.image.height}
        className="h-full w-full rounded-lg object-cover"
      />
    );
  }

  return (
    <div className="bg-neutral-100 flex h-full w-full items-center justify-center rounded-lg">
      <span className="text-neutral-400 text-sm">No preview</span>
    </div>
  );
}

function GetStartedCard({ card }: { card: TProjectHomeGetStartedCard }) {
  const { virtualLabId, projectId } = useWorkspace();
  const baseRoute = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;

  return (
    <div className="flex min-h-0 flex-col gap-3 overflow-hidden rounded-xl border border-neutral-300 p-5">
      <h3 className="text-primary-8 shrink-0 text-3xl font-bold">{card.title}</h3>
      <p className="text-primary-8 shrink-0 text-sm font-normal leading-normal">
        {card.description}
      </p>

      <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg">
        <CardMedia card={card} />
      </div>

      <Link
        href={`${baseRoute}${card.link}`}
        className="flex w-full shrink-0 flex-row items-center justify-between rounded-[60px] border-2 border-white/20 bg-[#002766] px-6 py-2.5 text-xl font-semibold text-white no-underline shadow-[-8px_-8px_12px_0_rgba(255,255,255,0.92),6px_8px_12px_0_rgba(0,0,0,0.12)] transition-opacity hover:opacity-90"
      >
        {card.label}
        <RiArrowRightLine className="size-4 shrink-0" />
      </Link>

      {card.resources.length > 0 && (
        <ul className="flex shrink-0 flex-col">
          {card.resources.map((resource, idx) => (
            <li key={resource._key}>
              {idx > 0 && <div className="bg-neutral-300 my-0 h-px" />}
              <Link
                href={`${baseRoute}${resource.link}`}
                className="text-primary-8 flex items-center justify-between py-2.5 text-sm font-normal no-underline transition-colors hover:opacity-80"
              >
                <span>{resource.label}</span>
                <RiArrowRightLine className="size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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

function AnimatedDots() {
  const dotStyle = (delay: string): React.CSSProperties => ({
    width: 4,
    height: 4,
    minWidth: 4,
    minHeight: 4,
    borderRadius: '50%',
    animation: `dotBounce 0.6s ease-in-out infinite ${delay}`,
  });

  return (
    <div className="border-neutral-300 bg-neutral-100 flex w-12 items-end gap-1.5 rounded-lg border p-3">
      <div className="bg-neutral-7" style={dotStyle('0ms')} />
      <div className="bg-neutral-7" style={dotStyle('0.2s')} />
      <div className="bg-neutral-7" style={dotStyle('0.4s')} />
      <style>{`
        @keyframes dotBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

function ObiAssistantCard({ topic }: { topic: TObiAssistantTopic }) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-primary-8 text-lg font-semibold">{topic.title}</h4>
      <div
        className="flex flex-1 flex-col gap-3 rounded-lg border border-neutral-200 p-4"
        style={{
          boxShadow:
            '-8px -8px 12px 0 rgba(255, 255, 255, 0.92), 6px 24px 20px -16px rgba(0, 0, 0, 0.09)',
        }}
      >
        <div className="ml-auto w-[70%] flex-1">
          <div className="bg-neutral-1 rounded-lg p-4">
            <p className="text-primary-8 text-sm font-normal leading-normal">{topic.question}</p>
          </div>
        </div>
        <AnimatedDots />
        <button
          type="button"
          className="text-primary-8 mt-1 flex shrink-0 flex-row items-center justify-between rounded-full border border-neutral-300 px-4 py-3 text-sm font-medium transition-colors hover:bg-neutral-50"
        >
          Try in Assistant
          <RiArrowRightLine className="size-4 shrink-0" />
        </button>
      </div>
    </div>
  );
}

function ObiAssistantBlock({ topics }: { topics: TObiAssistantTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <section className="flex shrink-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-3">
          <h2 className="text-primary-8 text-2xl font-bold">OBI Assistant</h2>
          <span className="text-primary-9 border-primary-9 rounded-full border px-5 py-1 text-xs font-normal uppercase tracking-[1px]">
            AI-powered
          </span>
        </div>
        <p className="text-primary-8 text-base font-normal">
          Start a conversation – pick a suggestion or type your own question below.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 rounded-xl border border-neutral-300 p-5 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <ObiAssistantCard key={topic._key} topic={topic} />
        ))}
      </div>
    </section>
  );
}

export function GetStartedCards() {
  const client = getProductionClient();

  const { data, isLoading } = useQuery({
    queryKey: keyBuilderExternal.projectHomeGetStarted(),
    queryFn: () => client.fetch<TProjectHomeData>(ProjectHomeGetStartedQuery),
    staleTime: 60_000,
  });

  if (isLoading) return <GetStartedCardsSkeleton />;

  const cards = data?.getStarted ?? [];
  const assistantTopics = data?.obiAssistant ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {cards.length > 0 && (
        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <GetStartedCard key={card._key} card={card} />
          ))}
        </section>
      )}
      <ObiAssistantBlock topics={assistantTopics} />
    </div>
  );
}
