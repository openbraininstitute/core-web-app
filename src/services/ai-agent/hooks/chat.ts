import React from 'react';
import { useSession } from 'next-auth/react';
import { useChat } from '@ai-sdk/react';

import { serviceAiAgentUrl } from '../api';
import { useAIToolsSelection } from '@/components/ai-assistant/state';
import { log } from '@/utils/logger';

export interface AiAgentRateLimit {
  limit: number;
  remaining: number;
  /** Number of seconds before new free credits */
  reset: number;
}

export function useServiceAiAgentChat(threadId: string) {
  const [toolsSelection] = useAIToolsSelection();
  const [rateLimit, setRateLimit] = React.useState<AiAgentRateLimit | null>(null);
  const session = useSession();
  const chat = useChat({
    api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
    id: threadId,
    headers: {
      Authorization: `Bearer ${session.data?.accessToken}`,
    },
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages.at(-1);
      return {
        content: (lastMessage?.content ?? '').trim(),
        tool_selection: toolsSelection,
      };
    },
    fetch: async (url, options) => {
      const resp = await fetch(url, options);
      const newRateLimit: AiAgentRateLimit = {
        limit: parseInt(resp.headers.get('x-ratelimit-limit') ?? '-1', 10),
        remaining: parseInt(resp.headers.get('x-ratelimit-remaining') ?? '-1', 10),
        reset: parseInt(resp.headers.get('x-ratelimit-reset') ?? '-1', 10),
      };
      setRateLimit(newRateLimit);
      return resp;
    },
  });

  return {
    rateLimit,
    messages: chat.messages,
    append: chat.append,
    status: chat.status,
    error: chat.error,
    stop: chat.stop,
    clear: () => chat.setMessages([]),
  };
}
