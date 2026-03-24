'use client';

import { VideoCameraOutlined } from '@ant-design/icons';
import { RiCloseLargeFill, RiPlayFill } from '@remixicon/react';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Card, CardDescription, CardTitle } from '@/ui/molecules/card';
import { cn } from '@/utils/css-class';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

const INITIAL_COUNT = 4;

export function DiscoverCard({
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
  return (
    <Link
      href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/tutorials/${slug}`}
      className="flex w-full"
    >
      <Card
        className={cn(
          'w-full bg-white border-none px-4 cursor-pointer group',
          'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)]',
          'hover:shadow-bnb hover:border-gray-200 hover:border hover:bg-gray-100',
          { 'bg-neutral-2': isSelected }
        )}
      >
        <CardTitle className="text-primary-9 group-hover:text-primary-8 group-hover:font-black">
          {title}
        </CardTitle>
        <CardDescription className="relative h-30.75 w-auto px-4 mt-auto">
          <Image
            fill
            alt={title}
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
        </CardDescription>
      </Card>
    </Link>
  );
}

export function Grid({ tutorials }: { tutorials: Array<TTutorial> }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tutorials : tutorials.slice(0, INITIAL_COUNT);
  const hasMore = tutorials.length > INITIAL_COUNT;
  const { slug } = useParams<{ slug: string }>();

  return (
    <section id="discover-tutorials" className="w-full flex flex-col my-6 @container">
      <div className="flex items-center justify-between w-full px-2 mb-2">
        <h2 className="font-medium text-primary-9">Discover</h2>
        {hasMore && (
          <Button
            rounded
            variant="ghost"
            className={cn('text-primary-9 font-light', {
              'h-9! w-9! p-2 rounded-full shadow-sm': expanded,
            })}
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <RiCloseLargeFill /> : `See all (${tutorials.length} videos)`}
          </Button>
        )}
      </div>
      <motion.div
        layout
        className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3  @5xl:grid-cols-4 gap-1.5 w-full"
      >
        <AnimatePresence initial={false}>
          {visible.map((p) => (
            <motion.div
              key={p.url}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="w-full flex"
            >
              <DiscoverCard
                title={p.title}
                image={p.poster}
                slug={p.slug}
                isSelected={slug === p.slug}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
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
