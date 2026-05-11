'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, getToolName, isToolUIPart } from 'ai';
import { atom, useAtom, useSetAtom, useStore } from 'jotai';
import { useEffect, useRef } from 'react';

import { atomRateLimit, useAIActiveTools } from '@/components/ai-assistant/state';
import { useDefaultConfig } from '@/features/scan-config/components/hooks/schema';
import { findConfigKeyInState } from '@/features/scan-config/helpers';
import { useAccessToken } from '@/hooks/useAccessToken';
import { lastConfigUpdateAtom, preMessageConfigAtom } from '@/state/config-highlights';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { logError } from '@/utils/logger';

import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { useAiAssistant } from '../assistant';

import type { Config } from '@/features/scan-config/components/components';
import type { AiAgentRateLimitEndpoint } from './rate-limit';

export const agentStateAtom = atom<Record<string, Config>>({});

export function useServiceAiAgentChat(threadId: string) {
  const jotaiStore = useStore();
  const assistant = useAiAssistant();
  const assistantInitialMessages = assistant.initialMessages.useValue();
  const isLoadingMessages = assistant.isLoadingMessages.useValue();
  const accessToken = useAccessToken();
  const activeTools = useAIActiveTools();
  const queryClient = useQueryClient();
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const setRateLimit = useSetAtom(atomRateLimit);

  const [, setConfig] = useAtom(configStateAtom);
  const [__, setIsChatReady] = useAtom(isChatReadyAtom);
  const setLastConfigUpdate = useSetAtom(lastConfigUpdateAtom);
  const setPreMessageConfig = useSetAtom(preMessageConfigAtom);
  const configUpdateCounterRef = useRef(0);
  // Whether we've already captured the pre-message config snapshot for the
  // current streaming response. Reset when a new editstate message starts.
  const capturedPreMessageConfigRef = useRef(false);
  const preMessageCaptureMessageIdRef = useRef<string | null>(null);

  // Track the last config we applied via setConfig so flash diffs are
  // computed incrementally. agentStateAtom updates asynchronously through
  // the Jotai chain, so reading it directly would produce stale oldConfig
  // when multiple editstate calls arrive in rapid succession.
  const lastAppliedConfigRef = useRef<Record<string, unknown> | null>(null);

  // Track the last editstate tool invocation ID we processed to avoid
  // re-processing cached messages on conversation switch while still
  // detecting new editstate results during streaming (where the message
  // ID stays the same but new tool invocations appear).
  const lastProcessedInvocationIdRef = useRef<string | null>(null);

  // Reset the tracker when the thread changes.
  const prevThreadIdRef = useRef(threadId);
  useEffect(() => {
    if (prevThreadIdRef.current !== threadId) {
      lastProcessedInvocationIdRef.current = null;
      lastAppliedConfigRef.current = null;
      capturedPreMessageConfigRef.current = false;
      prevThreadIdRef.current = threadId;
    }
  }, [threadId]);

  const chat = useChat({
    id: threadId,
    transport: new DefaultChatTransport({
      api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
      headers: () => ({
        Authorization: `Bearer ${accessToken}`,
      }),
      body: () => ({
        toolSelection: activeTools,
        frontendUrl: `${globalThis.location.origin}${globalThis.location.pathname}${globalThis.location.search}`,
        sharedState: jotaiStore.get(agentStateAtom),
      }),
      prepareSendMessagesRequest: ({ messages, body }) => {
        const lastMessage = messages.at(-1);

        return {
          body: {
            ...body,
            parts: lastMessage?.parts ?? [],
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
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (!lastMessage) return;

    // While initial messages are still loading, don't process anything.
    // This prevents the useChat cache from triggering setConfig before
    // the assistant has finished hydrating the thread.
    if (isLoadingMessages) return;

    // Find the most recent editstate tool result in the last message.
    const editstateResult = lastMessage.parts
      .toReversed()
      .filter(isToolUIPart)
      .find((p) => getToolName(p) === 'editstate' && p.state === 'output-available');

    // Derive a stable ID for the invocation we found (if any).
    const invocationId = editstateResult?.toolCallId ?? null;

    // If the messages array matches the initial load exactly, mark the
    // latest invocation as processed so we don't re-handle it, but don't
    // actually run the editstate logic (these are historical messages).
    if (assistantInitialMessages.length === chat.messages.length) {
      if (invocationId) lastProcessedInvocationIdRef.current = invocationId;
      return;
    }

    // Skip if we already processed this exact invocation.
    if (!invocationId || invocationId === lastProcessedInvocationIdRef.current) {
      return;
    }

    // Mark as processed before doing work to avoid double-firing.
    lastProcessedInvocationIdRef.current = invocationId;

    if (!editstateResult?.output) return;

    try {
      const result = editstateResult.output as Record<string, any>;
      const detectedKey = findConfigKeyInState(result.state);
      const newConfig = detectedKey ? result.state[detectedKey] : null;
      // Use lastAppliedConfigRef for incremental flash diffs. Falls back
      // to the live agentStateAtom for the very first editstate call.
      const currentState = jotaiStore.get(agentStateAtom) as Record<string, unknown>;
      const activeKey = findConfigKeyInState(currentState);
      const oldConfig =
        lastAppliedConfigRef.current ?? (activeKey ? currentState[activeKey] : null);

      // Snapshot the config before the first editstate call in this message
      // so the diff bar can compute accumulated diffs without walking history.
      if (preMessageCaptureMessageIdRef.current !== lastMessage.id) {
        capturedPreMessageConfigRef.current = false;
        preMessageCaptureMessageIdRef.current = lastMessage.id;
      }
      if (!capturedPreMessageConfigRef.current) {
        setPreMessageConfig(oldConfig as Record<string, unknown> | null);
        capturedPreMessageConfigRef.current = true;
      }

      setConfig(newConfig);
      // Update the ref so the next editstate call diffs against this config.
      if (newConfig) lastAppliedConfigRef.current = newConfig;

      // Only flash when the very last part is the editstate result itself
      const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
      const isLastPartEditState =
        isToolUIPart(lastPart) &&
        getToolName(lastPart) === 'editstate' &&
        lastPart.state === 'output-available';

      if (isLastPartEditState && newConfig && editstateResult.input) {
        configUpdateCounterRef.current += 1;
        setLastConfigUpdate({
          oldConfig: oldConfig as Record<string, unknown> | null,
          newConfig,
          counter: configUpdateCounterRef.current,
        });
      }
    } catch {
      logError('Failed to parse tool invocation result as JSON:', editstateResult.output);
    }
  }, [
    chat.messages,
    setConfig,
    setPreMessageConfig,
    setLastConfigUpdate,
    isLoadingMessages,
    assistantInitialMessages.length,
    jotaiStore,
  ]);

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
export const isChatReadyAtom = atom(true);

export function useAgentState(key: string, config?: Config) {
  const [, setAIAgentState] = useAtom(agentStateAtom);
  const setLastConfigUpdate = useSetAtom(lastConfigUpdateAtom);
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
      setAIAgentState({});
    };
  }, [defaultConfig, config, key, setAIAgentState]);

  // Clear stale flash state on unmount so the next page doesn't flash
  useEffect(() => {
    return () => {
      setLastConfigUpdate(null);
    };
  }, [setLastConfigUpdate]);
}

export function useAIConfig() {
  const [aiConfig, setAiConfig] = useAtom(configStateAtom);
  const [aiAgentState] = useAtom(agentStateAtom);
  const [isChatReady] = useAtom(isChatReadyAtom);

  const aiCircuitId = (aiConfig as any)?.initialize?.circuit?.id_str;
  const activeKey = findConfigKeyInState(aiAgentState as Record<string, unknown>);
  const agentCircuitId = activeKey
    ? (aiAgentState as any)?.[activeKey]?.initialize?.circuit?.id_str
    : undefined;
  const guardPassed = aiCircuitId === agentCircuitId;

  return {
    aiConfig: guardPassed ? aiConfig : null,
    setAiConfig,
    isChatReady,
  };
}
