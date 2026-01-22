'use client';

import { type CreateMessage, type Message, useChat } from '@ai-sdk/react';
import type { ChatRequestOptions, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { atom, useAtom } from 'jotai';
import { userAgent } from 'next/server';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAIActiveTools } from '@/components/ai-assistant/state';
import type { Config } from '@/features/scan-config/components/components';
import { logError } from '@/util/logger';
import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';

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

  const patchAtomKey = globalThis.location.pathname.includes('workflows/simulate/configure/circuit')
    ? 'smc_simulation_config'
    : '';

  const patchKeyToTool = useRef({
    smc_simulation_config: 'obione-generatesimulationsconfig',
    '': '',
  });

  const [_, setPatches] = useAtom(patchesAtoms[patchAtomKey]);

  const chat = useChat({
    api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
    id: threadId,
    initialMessages,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages.at(-1);
      return {
        content: (lastMessage?.content ?? '').trim(),
        tool_selection: activeTools,
        frontend_url: `${globalThis.location.pathname}${globalThis.location.search}`,
        shared_state: AI_AGENT_STATE,
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
      return resp;
    },
  });

  useEffect(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];

    const toolInvocation = lastMessage?.parts.find(
      (p) =>
        p.type === 'tool-invocation' &&
        p.toolInvocation.toolName === patchKeyToTool.current[patchAtomKey]
    ) as ToolInvocationUIPart | undefined;

    //@ts-expect-error
    if (toolInvocation?.toolInvocation?.result) {
      //@ts-expect-error
      const result = JSON.parse(toolInvocation?.toolInvocation?.result ?? '');
      const patches = USER_HAS_PROMPTED && result?.patches ? result.patches : [];
      setPatches(patches);
    }
  }, [chat.messages, patchAtomKey, setPatches]);

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

const AI_AGENT_STATE: {
  smc_simulation_config?: Config;
} = {};

let USER_HAS_PROMPTED = false;

export function setUserHasPrompted(value: boolean) {
  USER_HAS_PROMPTED = value;
}

type Patch = {
  op: 'replace' | 'add' | 'delete';
  path: string;
  value: Config;
};

export function useAgentState(key: 'smc_simulation_config') {
  useEffect(() => {
    setUserHasPrompted(false);
  }, []);
  const setAgentState = useCallback(
    (value: Config) => {
      AI_AGENT_STATE[key] = value;
    },
    [key]
  );

  return [AI_AGENT_STATE[key], setAgentState] as const;
}

export const patchesAtoms = {
  smc_simulation_config: atom<Patch[]>([]),
  '': atom<Patch[]>([]),
};
