'use client';

import { VideoCameraOutlined } from '@ant-design/icons';
import { RiPlayFill } from '@remixicon/react';
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardDescription, CardTitle } from '@/ui/molecules/card';
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
      <Card
        className={cn(
          'w-full bg-white border-none px-4 cursor-pointer group',
          'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] gap-2.5',
          'hover:shadow-bnb hover:border-gray-200 hover:border hover:bg-gray-100',
          { 'bg-neutral-2': isSelected }
        )}
      >
        <CardTitle className="text-primary-9 group-hover:text-primary-8 group-hover:font-black">
          {t}
        </CardTitle>
        <CardDescription className="relative aspect-video w-full mt-auto">
          <div className="relative w-full h-full">
            <Image
              fill
              alt={t}
              src={image}
              className={cn('rounded-md transition-all ease-in-out', {
                'grayscale brightness-90 contrast-60 opacity-80': isSelected,
              })}
            />
            <div
              className={cn('absolute inset-0 bg-black/30 rounded-md', {
                'filter grayscale-50': isSelected,
              })}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
              <RiPlayFill className="text-white size-10" />
            </div>
          </div>
        </CardDescription>
      </Card>
    </Link>
  );
}

export function TutorialGrid({ tutorials }: { tutorials: Array<TTutorial> }) {
  const { slug } = useParams<{ slug: string }>();

  return (
    <section id="tutorials-list" className="w-full flex flex-col">
      <h2 className="font-medium text-primary-9 px-2 mb-2">Tutorials</h2>
      <div className="secondary-scrollbar flex w-full gap-1.5 overflow-x-auto pb-2">
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
