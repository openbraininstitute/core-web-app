'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import {
  type ContentForFeatureItem,
  useSanityContentForFeatureItems,
} from '@/components/documentation/hooks/use-sanity-content-for-features';
import FeaturesCard from '@/ui/segments/help/features/features-card';
import Slugify from '@/util/slugify';

const SCALE_ORDER = ['subcellular', 'cellular', 'circuit'];
const SCALE_LABEL: Record<string, string> = {
  subcellular: 'Subcellular',
  cellular: 'Cellular',
  circuit: 'Circuit',
};

export default function FeaturesContent() {
  const items = useSanityContentForFeatureItems() as ContentForFeatureItem[];
  const searchParams = useSearchParams();
  const activeScale = searchParams.get('scale');

  useEffect(() => {
    if (!activeScale) return;
    const el = document.getElementById(`scale-${activeScale}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeScale]);

  if (!items.length) {
    return <p className="text-primary-9/80">No features found.</p>;
  }

  const grouped = SCALE_ORDER.map((id) => ({
    id,
    name: SCALE_LABEL[id],
    items: items.filter((item) => Slugify(item.Scale) === id),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex w-full flex-col gap-10">
      {grouped.map((group) => (
        <section key={group.id} id={`scale-${group.id}`} className="flex flex-col gap-4">
          <h2 className="text-primary-9 text-2xl font-bold">{group.name}</h2>
          {group.items.map((item) => (
            <FeaturesCard
              key={item.Feature_title ?? `${group.id}-${item.Topic ?? 'feature'}`}
              item={item}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
