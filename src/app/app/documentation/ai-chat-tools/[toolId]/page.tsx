'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useAITools } from '@/services/ai-agent/tools/tools';

export default function SingleChatToolPage() {
  const { toolId } = useParams();

  const selectedTool = useAITools()?.find((tool) => tool.id === toolId);

  return (
    <div className="relative flex w-full flex-col gap-y-4 text-white">
      <div>
        <Link
          href="/app/documentation/ai-chat-tools"
          className="text-primary-2 mb-3 text-base font-normal tracking-wider uppercase"
        >
          Ai chat tools
        </Link>
        <h1 className="text-4xl font-bold">Chat Tool {toolId}</h1>
      </div>
      <p className="text-lg leading-normal">{selectedTool?.description}</p>
    </div>
  );
}
