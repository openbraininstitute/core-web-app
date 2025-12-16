'use client';

import React from 'react';
import { ChatRequestOptions, DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';

import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';

import { getLastMessageText } from '../api/util';
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
  const [rateLimitRemaining, setRateLimitRemaining] = React.useState(0);
  const activeToolsRef = React.useRef(activeTools);
  activeToolsRef.current = activeTools;

  const chat = useChat({
    experimental_throttle: 50,
    id: `${threadId}-${initialMessages.length}`,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      prepareSendMessagesRequest: ({ messages }) => {
        return {
          body: {
            content: getLastMessageText(messages),
            tool_selection: activeToolsRef.current,
            frontend_url: `${globalThis.location.pathname}${globalThis.location.search}`,
          },
        };
      },
      fetch: async (url, options) => {
        const resp = await fetch(url, options);
        const newRateLimit: AiAgentRateLimit = {
          limit: parseInt(resp.headers.get('x-ratelimit-limit') ?? '-1', 10),
          remaining: parseInt(resp.headers.get('x-ratelimit-remaining') ?? '-1', 10),
          reset: parseInt(resp.headers.get('x-ratelimit-reset') ?? '-1', 10),
        };
        setRateLimitRemaining(newRateLimit.remaining);
        return resp;
      },
    }),
  });

  return {
    rateLimitRemaining,
    messages: chat.messages,
    sendMessage: (message: any, chatRequestOptions?: ChatRequestOptions) => {
      chat.sendMessage(message, chatRequestOptions);
      if (chat.messages.length === 0) {
        // We suggest a title for the thread based
        // on the first message.
        try {
          serviceAiAgentThreadSuggestTitle({
            accessToken,
            threadId,
            title: message.text,
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
