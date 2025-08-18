'use client';

import { useSearchParams } from 'next/navigation';

import AIToolCard from '@/ui/segments/help/ai-chat-tools/ai-tool-card';

import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools/';

export default function AIChatToolsContent({ content }: { content: AIChatToolsSectionProps[] }) {
  const searchParams = useSearchParams();

  const activeTool = searchParams.get('tool') ?? undefined;

  const filteredContent = content.filter((tool) => tool.id === activeTool);

  if (filteredContent.length === 0) {
    return (
      <div className="col-span-3">
        No features found for tool <span className="font-medium">&quot;{activeTool}&quot;</span>.
      </div>
    );
  }

  return (
    <div className="col-span-3 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {filteredContent && <AIToolCard content={filteredContent[0]} />}
    </div>
  );
}
