import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';

import { serviceAiAgentThreadMessages } from '../../api';

import type { UIMessage } from '@ai-sdk/react';
import type { useQueryClient } from '@tanstack/react-query';
import type { Signal } from '../signal';
import type { AssistantContext } from '../types';

export class MessageManager {
  constructor(
    private readonly target: {
      initialMessages: Signal<UIMessage[]>;
    },
    public queryClient?: ReturnType<typeof useQueryClient>
  ) {}

  readonly loadMessages = async (context: AssistantContext, threadId: string) => {
    const { accessToken, virtualLabId, projectId } = context;
    this.target.initialMessages.set([]);

    if (this.queryClient) {
      const data = await this.queryClient.fetchQuery({
        queryKey: keyBuilderAI.messages(threadId, virtualLabId, projectId),
        queryFn: async () => {
          const resp = await serviceAiAgentThreadMessages({
            accessToken,
            threadId,
          });
          return { results: resp.results.reverse() };
        },
        staleTime: 30000,
      });
      this.target.initialMessages.set(data.results as UIMessage[]);
    }
  };
}
