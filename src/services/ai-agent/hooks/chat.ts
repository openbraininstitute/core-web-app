'use client';

import { type CreateMessage, type Message, useChat } from '@ai-sdk/react';
import type { ChatRequestOptions, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { atom, useAtom } from 'jotai';
import React, { useEffect } from 'react';
import { useAIActiveTools } from '@/components/ai-assistant/state';
import type { Config } from '@/features/scan-config/components/components';
import { logError } from '@/util/logger';
import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';

let AI_AGENT_STATE: { id?: string; config?: Record<string, Config> } = {};
let returnId: string = '';

export interface AiAgentRateLimit {
  limit: number;
  remaining: number;
  /** Number of seconds before new free credits */
  reset: number;
}

const RATE_LIMIT_STORAGE_KEY = 'ai-agent-rate-limit-remaining';

function getStoredRateLimit(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored !== null) {
      const value = parseInt(stored, 10);
      if (!Number.isNaN(value) && value >= 0) {
        return value;
      }
    }
  } catch (_error) {
    // Ignore localStorage errors (e.g., in private browsing mode)
  }
  return 0;
}

function setStoredRateLimit(value: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, value.toString());
  } catch (_error) {
    // Ignore localStorage errors (e.g., in private browsing mode)
  }
}

export function useServiceAiAgentChat(threadId: string) {
  const assistant = useAiAssistant();
  const initialMessages = assistant.initialMessages.useValue();
  const { accessToken } = assistant.useContext();
  const activeTools = useAIActiveTools();
  const [rateLimitRemaining, setRateLimitRemaining] = React.useState(() => getStoredRateLimit());

  const [_, setPatches] = useAtom(patchesAtom);

  const chat = useChat({
    api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
    id: threadId,
    initialMessages,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-request-id': AI_AGENT_STATE.id ?? '',
    },
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages.at(-1);
      return {
        content: (lastMessage?.content ?? '').trim(),
        tool_selection: activeTools,
        frontend_url: `${globalThis.location.pathname}${globalThis.location.search}`,
        shared_state: AI_AGENT_STATE.config,
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
      setStoredRateLimit(newRateLimit.remaining);
      returnId = resp.headers.get('x-request-id') ?? '';
      return resp;
    },
  });

  useEffect(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];

    const toolInvocation = lastMessage?.parts.find(
      (p) =>
        p.type === 'tool-invocation' &&
        p.toolInvocation.toolName === 'obione-generatesimulationsconfig'
    ) as ToolInvocationUIPart | undefined;

    //@ts-expect-error
    if (toolInvocation?.toolInvocation?.result && returnId === AI_AGENT_STATE.id) {
      //@ts-expect-error
      const result = JSON.parse(toolInvocation?.toolInvocation?.result ?? '');
      const patches = result?.patches ? result.patches : [];
      setPatches(patches);
    }
  }, [chat.messages, setPatches]);

  return {
    rateLimitRemaining,
    messages: chat.messages,
    append: (message: Message | CreateMessage, chatRequestOptions?: ChatRequestOptions) => {
      chat.append(message, chatRequestOptions);
      if (chat.messages.length === 0) {
        // We suggest a title for the thread based
        // on the first message.
        try {
          serviceAiAgentThreadSuggestTitle({
            accessToken,
            threadId,
            title: message.content,
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

type Patch = {
  op: 'replace' | 'add' | 'delete';
  path: string;
  value: Config;
};

export const patchesAtom = atom<Patch[]>([]);

export function useAgentState(key: 'smc_simulation_config', config: Config) {
  useEffect(() => {
    AI_AGENT_STATE = {
      id: crypto.randomUUID().replace(/-/g, ''),
      config: {
        [key]: config,
      },
    };
  }, [config, key]);

  return useAtom(patchesAtom);
}
