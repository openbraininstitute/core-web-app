'use client';

import { useAITools } from '@/services/ai-agent/tools/tools';
import AIChatToolsContent from '@/ui/segments/help/ai-chat-tools/content';
import AIChatToolsNavigation from '@/ui/segments/help/ai-chat-tools/navigation';

export type AIChatToolsSectionProps = {
  description?: string;
  description_frontend?: string;
  icon: React.FC;
  id: string;
  name: string;
};

export default function AiChatToolsSection() {
  const allTools: AIChatToolsSectionProps[] = useAITools() ?? [];

  return (
    <div className="border-neutral-2 bg-background mb-32 flex h-full max-h-[calc(100vh-18rem)] w-full overflow-hidden rounded-2xl border p-4">
      <div className="border-neutral-2 w-1/4 shrink-0 overflow-y-auto border-r pr-4">
        <AIChatToolsNavigation content={allTools} />
      </div>
      <div className="w-3/4 overflow-y-auto pl-4">
        <AIChatToolsContent content={allTools} />
      </div>
    </div>
  );
}
