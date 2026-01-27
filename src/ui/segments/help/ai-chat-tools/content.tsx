'use client';

import { useSearchParams } from 'next/navigation';
import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools/';
import AIToolCard from '@/ui/segments/help/ai-chat-tools/ai-tool-card';

export default function AIChatToolsContent({ content }: { content: AIChatToolsSectionProps[] }) {
  const searchParams = useSearchParams();

  const activeTool = searchParams.get('tool');

  if (!activeTool) {
    return (
      <div className="col-span-3 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
        {content.map((tool) => (
          <AIToolCard key={tool.id} content={tool} />
        ))}
      </div>
    );
  }

  const selected = content.find((tool) => tool.id === activeTool);

  if (!selected) {
    return <div className="col-span-3">No features found for this tool</div>;
  }

  return (
    <div className="col-span-3 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      <AIToolCard content={selected} />
    </div>
  );
}
