'use client';

import Link from 'next/link';

import { useAITools } from '@/services/ai-agent/tools/tools';

export default function ChatToolsPage() {
  const allTools = useAITools();

  return (
    <div className="relative flex w-full flex-col gap-y-6 text-white">
      <div>
        <h1 className="mb-3 text-4xl font-bold">Chat Tools</h1>
        <p>
          This page provides information about the chat tools available in our application. You can
          use these tools to interact with the system and get assistance.
        </p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-4">
        {allTools?.map((tool: { id: string; name: string }) => (
          <Link
            href={`/app/documentation/ai-chat-tools/${tool.id}`}
            key={tool.id}
            className="rounded-lg border border-solid border-primary-6 bg-primary-9 px-5 py-4 text-white transition-colors duration-300 ease-in-out hover:bg-primary-8"
          >
            <h2 className="text-xl font-semibold">{tool.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
