'use client';

import React from 'react';
import { ChatRequestOptions } from '@ai-sdk/ui-utils';
import { CreateUIMessage, UIMessage, useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';

import { useAIActiveTools } from '@/components/ai-assistant/state';
import { logError } from '@/util/logger';

export interface AiAgentRateLimit {
  limit: number;
  remaining: number;
  /** Number of seconds before new free credits */
  reset: number;
}

export function useServiceAiAgentChat(threadId: string) {
  const assistant = useAiAssistant();
  const initialMessages = assistant.initialMessages.useValue();
  const { accessToken } = assistant.useContext();
  const activeTools = useAIActiveTools();
  const [rateLimit, setRateLimit] = React.useState<AiAgentRateLimit | null>(null);
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: ({ messages }: { messages: UIMessage[] }) => {
          const lastMessage = messages.at(-1);
          // Extract text from new UIMessage parts structure
          const content =
            lastMessage?.parts
              ?.filter((part: any) => part.type === 'text')
              ?.map((part: any) => ('text' in part ? part.text : ''))
              ?.join('') ?? '';
          return {
            content: content.trim(),
            tool_selection: activeTools,
            frontend_url: `${globalThis.location.pathname}${globalThis.location.search}`,
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
      }),
    [accessToken, activeTools, threadId]
  );

  const chat = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });

  return {
    rateLimit,
    messages: chat.messages,
    append: (
      message: UIMessage | CreateUIMessage<any>,
      chatRequestOptions?: ChatRequestOptions // eslint-disable-line @typescript-eslint/no-unused-vars
    ) => {
      // Convert old append API to new sendMessage API
      let text = '';
      if ('content' in message) {
        text = message.content;
      } else if ('text' in message) {
        text = message.text;
      } else if ('parts' in message) {
        text =
          (message as any).parts
            ?.filter((part: any) => part.type === 'text')
            ?.map((part: any) => ('text' in part ? part.text : ''))
            ?.join('') ?? '';
      }

      chat.sendMessage({ text });

      if (chat.messages.length === 0) {
        // We suggest a title for the thread based
        // on the first message.
        try {
          serviceAiAgentThreadSuggestTitle({
            accessToken,
            threadId,
            title: text,
          });
        } catch (ex) {
          // Renaming the thread is not important.
          // If it fails, we just ignore it.
          logError('Unable to rename the thread:', ex);
        }
      }
    },
    status: chat.status,
    error: chat.error,
    stop: chat.stop,
    clear: () => chat.setMessages([]),
  };
}
