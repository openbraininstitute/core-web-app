'use client';

import { VideoCameraOutlined } from '@ant-design/icons';
import { RiPlayFill } from '@remixicon/react';
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

export function TutorialCard({
  title,
  slug,
  image,
  isSelected,
}: {
  isSelected: boolean;
  title: string;
  slug: string;
  image: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const t = upperFirst(lowerCase(title));
  return (
    <Link
      href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/tutorials/${slug}`}
      className="flex w-full"
    >
      <div
        className={cn(
          'relative aspect-video w-full overflow-hidden rounded-xl cursor-pointer group select-none',
          'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] hover:shadow-bnb'
        )}
        title={t}
      >
        <Image
          fill
          alt={t}
          src={image}
          className={cn('object-cover transition-all ease-in-out', {
            'grayscale brightness-90 contrast-60 opacity-80': isSelected,
          })}
        />
        <div
          className={cn('absolute inset-0 bg-black/30', {
            'filter grayscale-50': isSelected,
          })}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <RiPlayFill className="text-white size-10" />
        </div>
        <div
          className={cn(
            'absolute bottom-2 left-2 max-w-[calc(100%-1rem)] rounded-full px-3 py-1',
            'bg-white/90 backdrop-blur-sm shadow-sm',
            'text-primary-8 text-xs font-bold',
            'group-hover:bg-primary-8 group-hover:text-white'
          )}
        >
          <span className="line-clamp-1">{t}</span>
        </div>
      </div>
    </Link>
  );
}

export function TutorialGrid({ tutorials }: { tutorials: Array<TTutorial> }) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <section id="tutorials-list" className="w-full flex flex-col">
      <h2 className="text-primary-9 text-lg font-bold px-2 mb-2">Tutorials</h2>
      <div className="flex w-full gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tutorials.map((p) => (
          <div key={p.url} className="w-60 shrink-0 flex">
            <TutorialCard
              title={p.title}
              image={p.poster}
              slug={p.slug}
              isSelected={slug === p.slug}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EmptyTutorials() {
  return (
    <section id="discover-tutorials" className="w-full flex flex-col my-6">
      <h2 className="font-medium text-primary-9 px-2 mb-4">Discover</h2>
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl bg-white shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary-8 mb-5">
          <VideoCameraOutlined className="text-white! text-2xl" />
        </div>
        <h3 className="text-primary-8 text-lg font-semibold mb-1.5">No tutorials available yet</h3>
        <p className="text-neutral-4 text-sm max-w-sm leading-relaxed">
          Video guides and walkthroughs will appear here as they are published. Stay tuned for new
          content to help you get the most out of the platform.
        </p>
      </div>
    </section>
  );
}
