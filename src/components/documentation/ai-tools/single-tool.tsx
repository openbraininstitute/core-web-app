'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { WaveLoader } from '@/components/ai-assistant/wave-loader';
import { useAITool } from '@/services/ai-agent/tools/tools';

export default function SingleAIToolsContent() {
  const { toolId } = useParams<{ toolId: string }>();

  const selectedTool = useAITool(toolId);

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
      {!selectedTool && <WaveLoader />}
      <p className="text-lg leading-normal whitespace-pre-wrap">{selectedTool?.description}</p>
    </div>
  );
}
