'use client';

import { type CreateMessage, type Message, useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { atom, useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect } from 'react';

import { atomRateLimit, useAIActiveTools } from '@/components/ai-assistant/state';
import { useDefaultConfig } from '@/features/scan-config/components/hooks/schema';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { logError } from '@/util/logger';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';

import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';

import type { ChatRequestOptions, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import type { Config } from '@/features/scan-config/components/components';
import type { AiAgentRateLimitEndpoint } from './rate-limit';

const agentStateAtom = atom<Record<string, Config>>({});
let requestId = crypto.randomUUID().replace(/-/g, '');
let returnId = '';

export function useServiceAiAgentChat(threadId: string) {
  const [aiAgentState] = useAtom(agentStateAtom);
  const assistant = useAiAssistant();
  const assistantInitialMessages = assistant.initialMessages.useValue();
  const isLoadingMessages = assistant.isLoadingMessages.useValue();
  const { accessToken } = assistant.useContext();
  const activeTools = useAIActiveTools();
  const queryClient = useQueryClient();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const setRateLimit = useSetAtom(atomRateLimit);

  const [_, setConfig] = useAtom(configStateAtom);
  const [__, setIsChatReady] = useAtom(isChatReadyAtom);

  const chat = useChat({
    api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
    id: threadId,
    initialMessages: assistantInitialMessages,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-request-id': requestId,
    },
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages.at(-1);

      return {
        content: (lastMessage?.content ?? '').trim(),
        tool_selection: activeTools,
        frontend_url: `${globalThis.location.origin}${globalThis.location.pathname}${globalThis.location.search}`,
        shared_state: aiAgentState,
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
        p.toolInvocation.toolName === 'obione-designcircuitsimulationscanconfig'
    ) as ToolInvocationUIPart | undefined;

    // @ts-expect-error
    if (toolInvocation?.toolInvocation?.result && returnId === requestId) {
      try {
        // @ts-expect-error
        const result = JSON.parse(toolInvocation?.toolInvocation?.result ?? {});
        setConfig(result.smc_simulation_config ?? null);
      } catch {
        logError(
          'Failed to parse tool invocation result as JSON:',
          // @ts-expect-error
          toolInvocation.toolInvocation.result
        );
      }
    }
  }, [chat.messages, setConfig]);

  useEffect(() => {
    setIsChatReady(chat.status === 'ready');
  }, [chat.status, setIsChatReady]);

  return {
    messages: chat.messages,
    isLoadingMessages,
    append: (message: Message | CreateMessage, chatRequestOptions?: ChatRequestOptions) => {
      assistant.isEmptyThread.set(false);
      chat.append(message, chatRequestOptions);
      if (chat.messages.length === 0) {
        // We suggest a title for the thread based
        // on the first message.
        try {
          serviceAiAgentThreadSuggestTitle({
            accessToken,
            threadId,
            title: message.content,
          }).then(() => {
            queryClient.invalidateQueries({
              queryKey: keyBuilderAI.history(virtualLabId, projectId),
            });
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

export function useAgentState(key: 'smc_simulation_config' | '', config?: Config) {
  const [, setAIAgentState] = useAtom(agentStateAtom);
  const defaultConfig = useDefaultConfig('CircuitSimulationScanConfig');

  useEffect(() => {
    const stateConfig = config ?? defaultConfig;
    if (!stateConfig) return;

    setAIAgentState(
      key
        ? {
            [key]: stateConfig,
          }
        : {}
    );

    return () => {
      if (!defaultConfig) return;
      setAIAgentState({
        smc_simulation_config: defaultConfig,
      });
    };
  }, [defaultConfig, config, key, setAIAgentState]);

  return useCallback(() => {
    requestId = crypto.randomUUID().replace(/-/g, '');
  }, []);
}

export function useAIConfig() {
  const [aiConfig, setAiConfig] = useAtom(configStateAtom);
  const [aiAgentState] = useAtom(agentStateAtom);
  const [isChatReady] = useAtom(isChatReadyAtom);

  return {
    aiConfig:
      // @ts-expect-error
      aiConfig?.initialize?.circuit?.id_str ===
      // @ts-expect-error
      aiAgentState?.smc_simulation_config?.initialize?.circuit?.id_str
        ? aiConfig
        : null,
    setAiConfig,
    isChatReady,
  };
}
