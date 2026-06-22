'use client';

import { useChat } from '@ai-sdk/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DefaultChatTransport,
  type FileUIPart,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from 'ai';
import { atom, useAtom, useSetAtom, useStore } from 'jotai';
import { useCallback, useEffect, useRef, useState } from 'react';

import { presignedUrlCache } from '@/components/ai-assistant/message-item/storage-image-part';
import { atomRateLimit } from '@/components/ai-assistant/state';
import { useDefaultConfig } from '@/features/scan-config/components/hooks/schema';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { findConfigKeyInState } from '@/features/scan-config/helpers';
import { useAccessToken } from '@/hooks/useAccessToken';
import { lastConfigUpdateAtom, preMessageConfigAtom } from '@/state/config-highlights';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { logError } from '@/utils/logger';

import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from '../api';
import { uploadFilesAndCreateParts } from '../api/upload';
import { AiAssistant, useAiAssistant } from '../assistant';
import { fetchMessagesFromDB } from '../assistant/manager/message';

import type { Config } from '@/features/scan-config/types';
import type { AiAgentRateLimitEndpoint } from './rate-limit';

export const agentStateAtom = atom<Record<string, Config>>({});

export function useServiceAiAgentChat(threadId: string) {
  const jotaiStore = useStore();
  // useAiAssistant() must be called to run init/error/health side effects
  useAiAssistant();
  const assistantInitialMessages = AiAssistant.initialMessages.useValue();
  const isLoadingMessages = AiAssistant.isLoadingMessages.useValue();
  const accessToken = useAccessToken();
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
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    transport: new DefaultChatTransport({
      api: serviceAiAgentUrl(['qa/chat_streamed', threadId]),
      headers: () => ({
        Authorization: `Bearer ${accessToken}`,
      }),
      body: () => ({
        frontendUrl: `${globalThis.location.origin}${globalThis.location.pathname}${globalThis.location.search}`,
        sharedState: jotaiStore.get(agentStateAtom),
      }),
      prepareSendMessagesRequest: ({ messages, body }) => {
        const lastMessage = messages.at(-1);

        // If the last message is an assistant message with approval-responded parts,
        // include approvalResponses instead of parts.
        if (lastMessage?.role === 'assistant') {
          const approvalResponses = lastMessage.parts
            .filter(isToolUIPart)
            .filter((p) => p.state === 'approval-responded' && p.approval)
            .map((p) => ({
              approvalId: (p as any).approval.id as string,
              approved: (p as any).approval.approved as boolean,
              ...(!(p as any).approval.approved && (p as any).approval.reason
                ? { reason: (p as any).approval.reason as string }
                : {}),
            }));

          if (approvalResponses.length > 0) {
            return {
              body: {
                ...body,
                approvalResponses,
              },
            };
          }
        }

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
  }, [assistantInitialMessages, chat.setMessages]);

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

  const [pendingUserMessage, setPendingUserMessage] = useState<{
    text: string;
    files: { name: string; type: string; previewUrl: string; uploaded: boolean }[];
  } | null>(null);

  const sendMessage = useCallback(
    async (text: string, files?: File[]) => {
      AiAssistant.isEmptyThread.set(false);

      let fileUIParts: FileUIPart[] | undefined;
      if (files && files.length > 0 && accessToken && threadId) {
        // Show a pending message immediately while files upload
        const pendingFiles = files.map((f) => ({
          name: f.name,
          type: f.type,
          previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : '',
          uploaded: false,
        }));
        setPendingUserMessage({ text, files: pendingFiles });

        try {
          // Upload files in parallel but update state as each completes
          const uploadPromises = files.map(async (file, idx) => {
            const parts = await uploadFilesAndCreateParts([file], accessToken, threadId);
            setPendingUserMessage((prev) => {
              if (!prev) return prev;
              const updated = [...prev.files];
              updated[idx] = { ...updated[idx], uploaded: true };
              return { ...prev, files: updated };
            });
            return parts[0];
          });
          const results = await Promise.all(uploadPromises);
          fileUIParts = results.filter(Boolean);

          // Seed the presigned URL cache with blob preview URLs so that
          // StorageImagePart renders instantly without a network round-trip.
          // This prevents the image from disappearing between the pending
          // message being removed and the real message rendering.
          fileUIParts.forEach((part, idx) => {
            const blobUrl = pendingFiles[idx]?.previewUrl;
            if (blobUrl && part.url.startsWith('storage://')) {
              presignedUrlCache[part.url] = blobUrl;
            }
          });
        } catch {
          // If upload fails, send without files
        }
        setPendingUserMessage(null);
      }

      chat.sendMessage({
        text,
        ...(fileUIParts && fileUIParts.length > 0 ? { files: fileUIParts } : {}),
      });

      if (chat.messages.length === 0) {
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
          logError('Unable to rename the thread:', ex);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chat, accessToken, threadId, queryClient, virtualLabId, projectId]
  );
  const stop = useCallback(async () => {
    chat.stop();
    queryClient.invalidateQueries({
      queryKey: keyBuilderAI.messages(threadId, virtualLabId, projectId),
    });
    const oldMessages = chat.messages;
    const messages = await fetchMessagesFromDB(
      queryClient,
      { accessToken: accessToken ?? 'NO-TOKEN', virtualLabId, projectId },
      threadId
    );

    // If the messages where not saved in the DB yet, we keep the local state.
    if (messages.length >= oldMessages.length) {
      chat.setMessages([
        ...oldMessages.slice(0, oldMessages.length - 1),
        ...messages.slice(oldMessages.length - 1),
      ]);
    }
    // We add a dummy AI message to sync up with backend, in case messages where not yet saved in DB.
    else if (oldMessages.length > 0 && oldMessages[oldMessages.length - 1]?.role === 'user') {
      chat.setMessages([
        ...oldMessages,
        {
          id: `temp-id-${crypto.randomUUID()}`,
          role: 'assistant',
          parts: [],
        },
      ]);
    }
  }, [chat, queryClient, accessToken, virtualLabId, projectId, threadId]);

  useEffect(() => {
    AiAssistant.chat.sync({
      status: chat.status,
      error: chat.error,
      sendMessage,
      stop,
    });
  }, [chat.status, chat.error, sendMessage, stop]);

  useEffect(() => {
    if (chat.status === 'ready') {
      AiAssistant.chat.messages.set(chat.messages);
    }
  }, [chat.status, chat.messages]);

  return {
    messages: chat.messages,
    isLoadingMessages,
    sendMessage,
    status: chat.status,
    error: chat.error,
    stop,
    pendingUserMessage,
    addToolApprovalResponse: chat.addToolApprovalResponse,
  };
}

export const configStateAtom = atom<Config>({});
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

  const defaultConfig = {
    aiConfig: null,
    setAiConfig,
    isChatReady,
  };

  const activeKey = findConfigKeyInState(aiAgentState as Record<string, unknown>);

  if (
    !isPlainObject(aiConfig?.initialize) ||
    !activeKey ||
    !isPlainObject((aiAgentState as any)?.[activeKey]?.initialize)
  )
    return defaultConfig;

  // Circuit identity guard: only apply when both configs have a circuit object.
  // Non-circuit workflows (ion channel, skeletonization, etc.) skip this check.
  const aiCircuit = aiConfig.initialize?.circuit;
  const agentCircuit = (aiAgentState as any)?.[activeKey]?.initialize?.circuit;

  if (isPlainObject(aiCircuit) && isPlainObject(agentCircuit)) {
    if (aiCircuit.id_str !== agentCircuit.id_str) return defaultConfig;
  }

  return {
    aiConfig,
    setAiConfig,
    isChatReady,
  };
}
