'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import AIToolCard from '@/ui/segments/help/ai-chat-tools/ai-tool-card';
import Slugify from '@/util/slugify';

import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools/';

export default function AIChatToolsContent({ content }: { content: AIChatToolsSectionProps[] }) {
  const searchParams = useSearchParams();
  const activeTool = searchParams.get('tool');

  useEffect(() => {
    if (!activeTool) return;
    const tool = content.find((t) => t.id === activeTool);
    if (!tool) return;
    const el = document.getElementById(Slugify(tool.name));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [activeTool, content]);

  if (!content.length) {
    return <p className="text-primary-9/80">No AI tools available.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h2 className="text-primary-9 text-2xl font-bold">Tools</h2>
        {content.map((tool) => (
          <AIToolCard key={tool.id} content={tool} />
        ))}
      </section>
    </div>
  );
}
