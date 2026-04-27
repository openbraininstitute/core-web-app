'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';

import GuideCard from '@/ui/segments/help/guides/card';
import Slugify from '@/util/slugify';
import { cn } from '@/utils/css-class';

import type { GuideCardProps } from '@/services/sanity';
import type { GuidesContentsProps } from '@/services/sanity/api/get-guides-content';

const SCALE_LABEL: Record<string, string> = {
  subcellular: 'Subcellular',
  cellular: 'Cellular',
  circuit: 'Circuit',
};
const SCALE_ORDER = ['subcellular', 'cellular', 'circuit'];

export function GuidesView({ guides }: { guides: GuidesContentsProps }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeScale = searchParams.get('scale');

  const grouped = useMemo(() => {
    const knownScales = SCALE_ORDER.map((id) => ({
      id,
      name: SCALE_LABEL[id],
      items: guides.filter((g) => Slugify(g.scale ?? '') === id),
    })).filter((g) => g.items.length > 0);

    const otherItems = guides.filter((g) => !SCALE_ORDER.includes(Slugify(g.scale ?? '')));
    if (otherItems.length) {
      knownScales.push({ id: 'other', name: 'Other', items: otherItems });
    }
    return knownScales;
  }, [guides]);

  useEffect(() => {
    if (!activeScale) return;
    const el = document.getElementById(`scale-${activeScale}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeScale]);

  if (!guides?.length) {
    return <p className="text-primary-9/70">No guides available.</p>;
  }

  return (
    <div className="border-neutral-2 bg-background mb-32 flex h-full max-h-[calc(100vh-18rem)] w-full overflow-hidden rounded-2xl border p-4">
      <div className="border-neutral-2 w-1/4 shrink-0 overflow-y-auto border-r pr-4">
        <div className="flex w-full flex-col gap-y-2">
          <h3 className="text-primary-9 text-xs font-bold tracking-wide uppercase">Scale</h3>
          <div className="flex flex-col gap-y-1.5">
            {grouped.map((group) => {
              const isActive = activeScale === group.id;
              return (
                <button
                  type="button"
                  key={group.id}
                  aria-label={`View ${group.name} guides`}
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('scale', group.id);
                    router.replace(`${url.pathname}${url.search}`, { scroll: false });
                  }}
                  className={cn(
                    'text-primary-9 flex w-full items-center justify-between text-left text-sm',
                    isActive && 'font-bold'
                  )}
                >
                  {group.name}
                  {isActive && <span className="bg-primary-9 h-2 w-2 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="w-3/4 overflow-y-auto pl-4">
        <div className="flex w-full flex-col gap-10">
          {grouped.map((group) => (
            <section key={group.id} id={`scale-${group.id}`} className="flex flex-col gap-4">
              <h2 className="text-primary-9 text-2xl font-bold">{group.name}</h2>
              {group.items.map((guide, index) => (
                <GuideCard
                  key={guide.slug?.current ?? guide.title ?? `${group.id}-${index}`}
                  content={guide as GuideCardProps}
                />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GuidesView;
