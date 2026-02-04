'use client';

import { type CreateMessage, type Message, useChat } from '@ai-sdk/react';
import type { ChatRequestOptions, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { atom, useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';
import { useAIActiveTools, atomRateLimit } from '@/components/ai-assistant/state';
import type { Config } from '@/features/scan-config/components/components';
import { logError } from '@/util/logger';
import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';
import type { AiAgentRateLimitEndpoint } from './rate-limit';

export type { AiAgentRateLimitEndpoint };
const AI_AGENT_STATE: { id?: string; config?: Record<string, Config> } = {};
let returnId: string = '';

export function useServiceAiAgentChat(threadId: string) {
  const assistant = useAiAssistant();
  const initialMessages = assistant.initialMessages.useValue();
  const { accessToken } = assistant.useContext();
  const activeTools = useAIActiveTools();
  const setRateLimit = useSetAtom(atomRateLimit);

  const [_, setConfig] = useAtom(configStateAtom);
  const [__, setIsChatReady] = useAtom(isChatReadyAtom);

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
      const newRateLimit: AiAgentRateLimitEndpoint = {
        limit: parseInt(resp.headers.get('x-ratelimit-limit') ?? '-1', 10),
        remaining: parseInt(resp.headers.get('x-ratelimit-remaining') ?? '-1', 10),
        reset_in: parseInt(resp.headers.get('x-ratelimit-reset') ?? '-1', 10),
      };
      setRateLimit(newRateLimit);
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
      const result = JSON.parse(toolInvocation?.toolInvocation?.result ?? {});
      setConfig(result);
    }
  }, [chat.messages, setConfig]);

  useEffect(() => {
    setIsChatReady(chat.status === 'ready');
  }, [chat.status, setIsChatReady]);

  return {
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
  };
}

export const configStateAtom = atom<Config | null>(null);
const isChatReadyAtom = atom(true);

export function useAgentState(key: 'smc_simulation_config', config: Config) {
  const [_, setConfig] = useAtom(configStateAtom);
  useEffect(() => {
    AI_AGENT_STATE.id = crypto.randomUUID().replace(/-/g, '');
    return () => setConfig(null);
  }, [setConfig]);

  useEffect(() => {
    AI_AGENT_STATE.config = {
      [key]: config,
    };
  }, [config, key]);

  const updateId = useCallback(() => {
    AI_AGENT_STATE.id = crypto.randomUUID().replace(/-/g, '');
  }, []);

  return updateId;
}

export function useAIConfig() {
  const [aiConfig, setAiConfig] = useAtom(configStateAtom);
  const [isChatReady] = useAtom(isChatReadyAtom);

  return {
    aiConfig,
    setAiConfig,
    isChatReady,
  };
}
