'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, getToolName, isToolUIPart } from 'ai';
import { atom, useAtom, useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { atomRateLimit, useAIActiveTools } from '@/components/ai-assistant/state';
import { useDefaultConfig } from '@/features/scan-config/components/hooks/schema';
import { useAccessToken } from '@/hooks/useAccessToken';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { logError } from '@/utils/logger';

import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';
import { parseToolOutput } from '../utils/parse-tool-output';

import type { Config } from '@/features/scan-config/components/components';
import type { AiAgentRateLimitEndpoint } from './rate-limit';

const agentStateAtom = atom<Record<string, Config>>({});

export function useServiceAiAgentChat(threadId: string) {
  const [aiAgentState] = useAtom(agentStateAtom);
  const assistant = useAiAssistant();
  const assistantInitialMessages = assistant.initialMessages.useValue();
  const isLoadingMessages = assistant.isLoadingMessages.useValue();
  const accessToken = useAccessToken();
  const activeTools = useAIActiveTools();
  const queryClient = useQueryClient();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const setRateLimit = useSetAtom(atomRateLimit);

  const [_, setConfig] = useAtom(configStateAtom);
  const [__, setIsChatReady] = useAtom(isChatReadyAtom);

  const chat = useChat({
    id: threadId,
    transport: new DefaultChatTransport({
      api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
      headers: () => ({
        Authorization: `Bearer ${accessToken}`,
      }),
      prepareSendMessagesRequest: ({ messages }) => {
        const lastMessage = messages.at(-1);

        return {
          body: {
            parts: lastMessage?.parts ?? [],
            toolSelection: activeTools,
            frontendUrl: `${globalThis.location.origin}${globalThis.location.pathname}${globalThis.location.search}`,
            sharedState: aiAgentState,
          },
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
        return resp;
      },
    }),
    messages: assistantInitialMessages,
  });

  // Sync loaded messages into the chat hook when they change
  // (useChat's `messages` prop is only read on mount; subsequent updates need setMessages)
  useEffect(() => {
    if (assistantInitialMessages.length > 0) {
      chat.setMessages(assistantInitialMessages);
    }
  }, [assistantInitialMessages]);

  useEffect(() => {
    if (assistantInitialMessages.length === chat.messages.length) {
      return;
    }
    const lastMessage = chat.messages[chat.messages.length - 1];

    // Find the most recent editstate tool result
    const toolPart = lastMessage?.parts
      .toReversed()
      .find(
        (p) => isToolUIPart(p) && getToolName(p) === 'editstate' && p.state === 'output-available'
      );

    if (toolPart && 'output' in toolPart && toolPart.output) {
      try {
        const result = parseToolOutput(toolPart.output) as Record<string, unknown>;
        const state = result.state as Record<string, Config> | undefined;
        setConfig(state?.smc_simulation_config ?? null);
      } catch {
        logError('Failed to parse tool output:', toolPart.output);
      }
    }
  }, [chat.messages, setConfig, assistantInitialMessages.length]);

  useEffect(() => {
    setIsChatReady(chat.status === 'ready');
  }, [chat.status, setIsChatReady]);

  return {
    messages: chat.messages,
    isLoadingMessages,
    sendMessage: (text: string) => {
      assistant.isEmptyThread.set(false);
      chat.sendMessage({ text });
      if (chat.messages.length === 0) {
        // We suggest a title for the thread based on the first message
        try {
          serviceAiAgentThreadSuggestTitle({
            accessToken: accessToken ?? 'NO-TOKEN',
            threadId,
            title: text,
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

export function useAgentState(key: string, config?: Config) {
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
