import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';

import { serviceAiAgentThreadMessages } from '../../api';

import type { Message } from '@ai-sdk/react';
import type { useQueryClient } from '@tanstack/react-query';
import type { Signal } from '../signal';
import type { AssistantContext } from '../types';

export async function fetchMessagesFromDB(
  queryClient: ReturnType<typeof useQueryClient>,
  context: AssistantContext,
  threadId: string
): Promise<Message[]> {
  const { accessToken, virtualLabId, projectId } = context;
  const data = await queryClient.fetchQuery({
    queryKey: keyBuilderAI.messages(threadId, virtualLabId, projectId),
    queryFn: async () => {
      const resp = await serviceAiAgentThreadMessages({
        accessToken,
        virtualLabId,
        projectId,
        threadId,
      });
      return { results: resp.results.reverse() };
    },
    staleTime: 30000,
  });
  return data.results;
}

export class MessageManager {
  constructor(
    private readonly target: {
      initialMessages: Signal<Message[]>;
    },
    public queryClient?: ReturnType<typeof useQueryClient>
  ) {}

  readonly loadMessages = async (context: AssistantContext, threadId: string) => {
    this.target.initialMessages.set([]);

    if (this.queryClient) {
      const messages = await fetchMessagesFromDB(this.queryClient, context, threadId);
      this.target.initialMessages.set(messages);
    }
  };
}
