'use client';

import { ObiAssistantCard } from './obi-assistant-card';

import type { TObiAssistantTopic } from '@/ui/segments/project/get-started/query';

export function ObiAssistantBlock({ topics }: { topics: TObiAssistantTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <section className="flex shrink-0 flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-3">
          <h2 className="text-primary-8 text-2xl font-bold">OBI Assistant</h2>
          <span className="text-primary-9 border-primary-9 rounded-full border px-5 py-1 text-xs font-normal uppercase tracking-[1px]">
            AI-powered
          </span>
        </div>
        <p className="text-primary-8 text-base font-normal">
          Start a conversation – pick a suggestion or type your own question below.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 rounded-xl border border-neutral-300 p-5 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <ObiAssistantCard key={topic._key} topic={topic} />
        ))}
      </div>
    </section>
  );
}
