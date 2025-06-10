import React from 'react';
import { useSession } from 'next-auth/react';
import { useChat } from '@ai-sdk/react';

import { serviceAiAgentUrl } from '../api';
import { useAIToolsSelection } from '@/components/ai-assistant/state';

interface RateLimit {
  limit: string;
  remaining: string;
  reset: string;
}

export function useServiceAiAgentChat(threadId: string) {
  const toolsSelection = useAIToolsSelection();
  const [rateLimit, setRateLimit] = React.useState<RateLimit | null>(null);
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
    onResponse(resp: Response) {
      setRateLimit({
        limit: resp.headers.get('x-ratelimit-limit') ?? '',
        remaining: resp.headers.get('x-ratelimit-remaining') ?? '',
        reset: resp.headers.get('x-ratelimit-reset') ?? '',
      });
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
