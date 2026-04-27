'use client';

import Image from 'next/image';
import { useMemo } from 'react';

import { useSanityContentForNewsList } from '@/components/LandingPage/content';

import type { ContentForNewsItem } from '@/components/LandingPage/content';

function formatDate(d: string) {
  if (!d) return '';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(date);
}

function NewsCard({ news }: { news: ContentForNewsItem }) {
  const href = news.isExternalLink ? news.link : news.slug ? `/news/${news.slug}` : null;
  return (
    <article className="border-neutral-2 text-primary-9 flex w-full flex-col gap-3 rounded-xl border border-solid bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <span className="text-neutral-4 text-xs uppercase tracking-wide">
          {formatDate(news.date)}
        </span>
        {news.category && (
          <span className="text-primary-9 border-neutral-2 rounded-full border px-3 py-1 text-xs font-semibold">
            {news.category}
          </span>
        )}
      </div>
      <h3 className="text-primary-9 text-2xl font-bold leading-tight">{news.title}</h3>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        {news.imageURL && (
          <div className="relative aspect-video w-full max-w-[220px] shrink-0 overflow-hidden rounded-lg">
            <Image src={news.imageURL} alt={news.title} fill unoptimized className="object-cover" />
          </div>
        )}
        <p className="text-primary-9/90 text-base leading-relaxed">{news.content}</p>
      </div>
      {href && (
        <a
          href={href}
          target={news.isExternalLink ? '_blank' : '_self'}
          rel={news.isExternalLink ? 'noreferrer noopener' : undefined}
          className="text-primary-7 mt-1 self-start text-sm font-semibold hover:underline"
        >
          Read more →
        </a>
      )}
    </article>
  );
}

export function NewsView() {
  const newsList = useSanityContentForNewsList();
  const items = useMemo(
    () =>
      [...(newsList ?? [])].sort(
        (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
      ),
    [newsList]
  );

  return (
    <div className="flex h-full max-h-full w-full flex-col overflow-hidden">
      {items.length ? (
        <div className="flex w-full flex-col gap-4 overflow-y-auto pr-2">
          {items.map((item) => (
            <NewsCard key={item.id} news={item} />
          ))}
        </div>
      ) : (
        <p className="text-primary-9/70">No news available.</p>
      )}
    </div>
  );
}

export default NewsView;
