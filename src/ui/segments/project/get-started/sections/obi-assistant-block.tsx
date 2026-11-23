'use client';

import { ObiAssistantCard } from './obi-assistant-card';

import type { TObiAssistantTopic } from '@/ui/segments/project/get-started/query';

export function ObiAssistantBlock({ topics }: { topics: TObiAssistantTopic[] }) {
  if (topics.length === 0) return null;

  return (
    <section className="flex shrink-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-primary-8 text-lg font-semibold">Try the OBI Assistant</h3>
        <p className="text-primary-8 text-base font-normal">
          Start a conversation – pick a suggestion or type your own question in the assistant.
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
