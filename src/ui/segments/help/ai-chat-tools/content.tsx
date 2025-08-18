import AIToolCard from '@/ui/segments/help/ai-chat-tools/ai-tool-card';

import type { AIChatToolsSectionProps } from '@/ui/segments/help/ai-chat-tools/';

export default function AIChatToolsContent({
  content,
  searchParams,
}: {
  content: AIChatToolsSectionProps[];
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const singleTool = content.find((tool) => tool.id === searchParams?.tool);

  if (!singleTool) {
    return (
      <div className="col-span-3 text-neutral-600">
        Pick a tool on the left to view features for that tool.
      </div>
    );
  }

  return (
    <div className="col-span-3 flex max-h-[82vh] w-full flex-col gap-y-4 overflow-y-scroll">
      {singleTool && <AIToolCard content={singleTool} />}
    </div>
  );
}
