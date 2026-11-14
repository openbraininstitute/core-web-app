'use client';

import { useQueryState } from 'nuqs';

import { TEACH_TOPICS, teachTopic } from '@/features/learn/teach';
import { TeachCard, TeachIndex } from '@/features/learn/ui/teach';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { cn } from '@/utils/css-class';

/**
 * Teach as a section of its own in the toolbar (the user asked to try it): Learn's Teach topics, the list down the
 * left and the one chosen beside it, as Learn lays them out.
 */
export function TeachPage() {
  const [topicId, setTopicId] = useQueryState('topic');
  const topic = teachTopic(topicId) ?? TEACH_TOPICS[0];
  return (
    <div className="mx-3 flex h-full min-h-0 gap-[24px] pt-2 pb-2 max-lg:h-auto max-lg:flex-col">
      <aside className="flex min-h-0 w-[min(400px,36%)] shrink-0 flex-col max-lg:w-full">
        <TeachIndex selected={topic} onSelect={setTopicId} />
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TeachCard
          key={topic.id}
          topic={topic}
          onSelect={setTopicId}
          className={cn(BOX_CLASS, 'learn-card secondary-scrollbar min-h-0 w-full flex-1 overflow-y-auto')}
        />
      </div>
    </div>
  );
}
