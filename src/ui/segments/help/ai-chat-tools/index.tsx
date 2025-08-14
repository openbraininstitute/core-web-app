import AIChatToolsContent from './content';
import AIChatToolsNavigation from './navigation';

import { useAITools } from '@/services/ai-agent/tools/tools';

export type AIChatToolsSectionProps = {
  description: string;
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
