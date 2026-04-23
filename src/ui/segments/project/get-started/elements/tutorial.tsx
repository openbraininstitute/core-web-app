'use client';

import { VideoCameraOutlined } from '@ant-design/icons';
import { RiCloseLargeFill, RiPlayFill } from '@remixicon/react';
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import { AnimatePresence, motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { ImageIcon } from '@/components/icons/image-states';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Card, CardDescription, CardTitle } from '@/ui/molecules/card';
import { Checkbox } from '@/ui/molecules/checkbox';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

const INITIAL_COUNT = 4;
const UNCATEGORIZED_LABEL = 'Other';
const normalizeCategory = (category: string | null | undefined) =>
  category ? lowerCase(category).replaceAll('-', ' ').trim() : null;
const TUTORIAL_CATEGORIES = [
  'Data',
  'Build',
  'Simulate',
  'Analysis',
  'Notebook',
  'Virtual Lab',
  'Project',
  'Extraction',
  'Validation',
  'Generation',
  'Workflows',
] as const;

export function TutorialCard({
  title,
  slug,
  image,
  category,
  isSelected,
}: {
  isSelected: boolean;
  title: string;
  slug: string;
  image: string | null;
  category: string | null;
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
          'w-full bg-white border-none px-4 cursor-pointer group items-start',
          'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] gap-1',
          'hover:shadow-bnb hover:border-gray-200 hover:border hover:bg-gray-100',
          { 'bg-neutral-2': isSelected }
        )}
      >
        {category && (
          <div className="py-1 px-4 border border-neutral-300 rounded-full text-xs uppercase tracking-wide text-neutral-500 font-normal">
            {category}
          </div>
        )}
        <CardTitle className="text-xl font-bold text-primary-9 group-hover:text-primary-8 mb-3">
          {t}
        </CardTitle>
        <CardDescription className="relative aspect-video w-full mt-auto">
          <div className="relative w-full h-full overflow-hidden rounded-md">
            {image ? (
              <>
                <Image
                  fill
                  alt={t}
                  src={image}
                  className={cn('rounded-md transition-all ease-in-out object-cover', {
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
              </>
            ) : (
              <Skeleton active={false} className="flex items-center justify-center w-full h-full">
                <ImageIcon className="size-10 text-gray-300" />
              </Skeleton>
            )}
          </div>
        </CardDescription>
      </Card>
    </Link>
  );
}

export function TutorialGrid({ tutorials }: { tutorials: Array<TTutorial> }) {
  const [expanded, setExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Array<string>>([]);
  const filterContainerRef = useRef<HTMLDivElement | null>(null);
  const { slug } = useParams<{ slug: string }>();
  const selectedCategoryKeys = new Set(
    selectedCategories.map((category) => normalizeCategory(category))
  );

  const filteredTutorials =
    selectedCategories.length === 0
      ? tutorials
      : tutorials.filter((tutorial) =>
          tutorial.category ? selectedCategoryKeys.has(normalizeCategory(tutorial.category)) : false
        );
  const visible = expanded ? filteredTutorials : filteredTutorials.slice(0, INITIAL_COUNT);
  const hasMore = filteredTutorials.length > INITIAL_COUNT;
  const normalizedCategoryKeys = new Set(
    TUTORIAL_CATEGORIES.map((category) => normalizeCategory(category))
  );

  const knownCategoryGroups = TUTORIAL_CATEGORIES.map((category) => ({
    category,
    items: filteredTutorials.filter(
      (tutorial) => normalizeCategory(tutorial.category) === normalizeCategory(category)
    ),
  })).filter((group) => group.items.length > 0);

  const extraCategories = Array.from(
    new Set(
      filteredTutorials
        .map((tutorial) => tutorial.category)
        .filter(
          (category): category is string =>
            !!category && !normalizedCategoryKeys.has(normalizeCategory(category))
        )
    )
  );

  const extraCategoryGroups = extraCategories.map((category) => ({
    category,
    items: filteredTutorials.filter((tutorial) => tutorial.category === category),
  }));

  const uncategorizedGroup = {
    category: UNCATEGORIZED_LABEL,
    items: filteredTutorials.filter((tutorial) => !tutorial.category),
  };

  const groupedTutorials = [
    ...knownCategoryGroups,
    ...extraCategoryGroups,
    ...(uncategorizedGroup.items.length > 0 ? [uncategorizedGroup] : []),
  ];

  const categoryCounts = TUTORIAL_CATEGORIES.map((category) => ({
    category,
    count: tutorials.filter(
      (tutorial) => normalizeCategory(tutorial.category) === normalizeCategory(category)
    ).length,
  }));
  const visibleCategoryCounts = categoryCounts.filter(({ count }) => count > 0);
  const hasSelectedAllCategories =
    visibleCategoryCounts.length > 0 &&
    visibleCategoryCounts.every(({ category }) => selectedCategories.includes(category));

  const toggleCategory = (category: string) => {
    setExpanded(false);
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((item) => item !== category) : [...prev, category]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!filterContainerRef.current?.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <section id="tutorials-list" className="w-full flex flex-col my-6 @container">
      <div className="flex items-center justify-between w-full px-2 mb-2">
        <div className="flex items-center gap-1.5">
          <h2 className="font-bold text-xl! text-primary-9">Tutorials</h2>
          {hasMore && (
            <Button
              rounded
              variant="ghost"
              className={cn('text-primary-9 font-light', {
                'h-9! w-9! p-2 rounded-full shadow-base': expanded,
              })}
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? <RiCloseLargeFill /> : `See all (${filteredTutorials.length} videos)`}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-primary-9 font-light">Filter by:</span>
          <div ref={filterContainerRef} className="relative">
            <Button
              rounded
              variant="ghost"
              className="py-1 px-4 border border-neutral-300 text-primary-9 font-medium text-base data-[state=open]:bg-white"
              onClick={() => setIsFilterOpen((prev) => !prev)}
            >
              {selectedCategories.length > 0
                ? `Categories (${selectedCategories.length})`
                : 'Categories'}
            </Button>
            {isFilterOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-120 w-[320px] rounded-md border border-neutral-3 bg-white p-3 shadow-lg">
                <div className="mb-3 flex items-center justify-between border-b border-neutral-3 pb-2">
                  <span className="text-sm font-medium text-primary-9">
                    {filteredTutorials.length} tutorials
                  </span>
                  <Button
                    rounded
                    variant="ghost"
                    className="h-auto p-0 text-sm font-medium text-primary-8 hover:bg-transparent"
                    onClick={() => {
                      setExpanded(false);
                      setSelectedCategories(
                        hasSelectedAllCategories
                          ? []
                          : visibleCategoryCounts.map(({ category }) => category)
                      );
                    }}
                  >
                    {hasSelectedAllCategories ? 'Deselect all' : 'Select all'}
                  </Button>
                </div>
                <div className="max-h-72 overflow-y-auto pr-1">
                  {visibleCategoryCounts.map(({ category, count }) => (
                    <div key={category} className="flex flex-row items-center justify-between py-2">
                      <span className="text-[16px] font-medium text-primary-9">
                        {category} <span className="text-neutral-500">({count})</span>
                      </span>
                      <Checkbox
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => toggleCategory(category)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button
            rounded
            variant="ghost"
            className="text-primary-9 font-light"
            onClick={() => {
              setSelectedCategories([]);
              setExpanded(false);
            }}
            disabled={selectedCategories.length === 0}
          >
            Reset filter
          </Button>
        </div>
      </div>
      {expanded ? (
        <div className="flex flex-col gap-5">
          {groupedTutorials.map((group) => (
            <section key={group.category} className="w-full">
              <div className="mb-2 px-2">
                <h3 className="text-lg font-normal uppercase tracking-wide text-neutral-500 mb-3">
                  {group.category}
                </h3>
                <div className="mt-1 border-b border-neutral-3" />
              </div>
              <motion.div
                layout
                className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 gap-1.5 w-full"
              >
                <AnimatePresence initial={false}>
                  {group.items.map((p) => (
                    <motion.div
                      key={p.url}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="w-full flex"
                    >
                      <TutorialCard
                        title={p.title}
                        image={p.posterImage}
                        slug={p.slug}
                        category={p.category}
                        isSelected={slug === p.slug}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </section>
          ))}
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4 gap-1.5 w-full"
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
                <TutorialCard
                  title={p.title}
                  image={p.posterImage}
                  slug={p.slug}
                  category={p.category}
                  isSelected={slug === p.slug}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
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
