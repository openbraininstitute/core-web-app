import { useSearchParams } from 'next/navigation';

import AIToolCard from './ai-tool-card';

import { AIChatToolsSectionProps } from '.';

export default function AIChatToolsContent({ content }: { content: AIChatToolsSectionProps[] }) {
  const searchParams = useSearchParams();
  const aiTool = searchParams.get('ai-tool');

  const singleTool = content.find((tool) => tool.id === aiTool);

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
