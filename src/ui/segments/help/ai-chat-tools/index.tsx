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
    <div className="grid h-full w-full grid-cols-4 gap-x-6">
      <AIChatToolsNavigation content={allTools} />
      <AIChatToolsContent content={allTools} />
    </div>
  );
}
