'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import {
  type ContentForFeatureItem,
  useSanityContentForFeatureItems,
} from '@/components/documentation/hooks/use-sanity-content-for-features';
import { useAITools } from '@/services/ai-agent/tools/tools';
import AIToolCard from '@/ui/segments/help/ai-chat-tools/ai-tool-card';
import FeaturesCard from '@/ui/segments/help/features/features-card';
import Slugify from '@/util/slugify';

import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools';

const SCALE_ORDER = ['subcellular', 'cellular', 'circuit'];
const SCALE_LABEL: Record<string, string> = {
  subcellular: 'Subcellular',
  cellular: 'Cellular',
  circuit: 'Circuit',
};

export default function FeaturesContent() {
  const items = useSanityContentForFeatureItems() as ContentForFeatureItem[];
  const aiTools: AIChatToolsSectionProps[] = useAITools() ?? [];
  const searchParams = useSearchParams();
  const activeScale = searchParams.get('scale');

  useEffect(() => {
    if (!activeScale) return;
    const el = document.getElementById(`scale-${activeScale}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeScale]);

  const grouped = SCALE_ORDER.map((id) => ({
    id,
    name: SCALE_LABEL[id],
    items: items.filter((item) => Slugify(item.Scale) === id),
  })).filter((g) => g.items.length > 0);

  if (!grouped.length && !aiTools.length) {
    return <p className="text-primary-9/80">No features found.</p>;
  }

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
      {aiTools.length > 0 && (
        <section id="scale-ai-tools" className="flex flex-col gap-4">
          <h2 className="text-primary-9 text-2xl font-bold">AI Tools</h2>
          {aiTools.map((tool) => (
            <AIToolCard key={tool.id} content={tool} />
          ))}
        </section>
      )}
    </div>
  );
}
