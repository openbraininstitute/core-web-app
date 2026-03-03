"use client";

import { type CreateMessage, type Message, useChat } from "@ai-sdk/react";
import type {
  ChatRequestOptions,
  ToolInvocationUIPart,
} from "@ai-sdk/ui-utils";
import { atom, useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
  useAIActiveTools,
  atomRateLimit,
} from "@/components/ai-assistant/state";
import type { Config } from "@/features/scan-config/components/components";
import { useDefaultConfig } from "@/features/scan-config/components/hooks/schema";

import { logError } from "@/util/logger";

import { serviceAiAgentThreadSuggestTitle, serviceAiAgentUrl } from "../api";
import { useAiAssistant } from "../assistant";
import type { AiAgentRateLimitEndpoint } from "./rate-limit";

const agentStateAtom = atom<Record<string, Config>>({});
const requestIdAtom = atom<string>(crypto.randomUUID().replace(/-/g, ""));
const returnIdAtom = atom<string>("");

export function useServiceAiAgentChat(threadId: string) {
  const [aiAgentState] = useAtom(agentStateAtom);
  const assistant = useAiAssistant();
  const initialMessages = assistant.initialMessages.useValue();
  const { accessToken } = assistant.useContext();
  const activeTools = useAIActiveTools();
  const setRateLimit = useSetAtom(atomRateLimit);

  const [_, setConfig] = useAtom(configStateAtom);
  const [__, setIsChatReady] = useAtom(isChatReadyAtom);
  const [requestId, setRequestId] = useAtom(requestIdAtom);
  const [returnId, setReturnId] = useAtom(returnIdAtom);

  const chat = useChat({
    api: serviceAiAgentUrl(["qa/chat_streamed", threadId]),
    id: threadId,
    initialMessages,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-request-id": requestId,
    },
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages.at(-1);

      return {
        content: (lastMessage?.content ?? "").trim(),
        tool_selection: activeTools,
        frontend_url: `${globalThis.location.origin}${globalThis.location.pathname}${globalThis.location.search}`,
        shared_state: aiAgentState,
      };
    },
    fetch: async (url, options) => {
      const resp = await fetch(url, options);
      const newRateLimit: AiAgentRateLimitEndpoint = {
        limit: parseInt(resp.headers.get("x-ratelimit-limit") ?? "-1", 10),
        remaining: parseInt(
          resp.headers.get("x-ratelimit-remaining") ?? "-1",
          10,
        ),
        reset_in: parseInt(resp.headers.get("x-ratelimit-reset") ?? "-1", 10),
      };
      setRateLimit(newRateLimit);
      setReturnId(resp.headers.get("x-request-id") ?? "");
      return resp;
    },
  });

  useEffect(() => {
    const lastMessage = chat.messages[chat.messages.length - 1];

    // Use toReversed() or slice().reverse() to avoid mutating the original array
    const toolInvocation = lastMessage?.parts.toReversed().find(
      (p) =>
        p.type === 'tool-invocation' &&
        p.toolInvocation.toolName === 'editstate' &&
        p.toolInvocation.state === 'result'
    ) as ToolInvocationUIPart | undefined;


    //@ts-expect-error
    if (toolInvocation?.toolInvocation?.result && returnId === requestId) {
          console.log(returnId)
          console.log(requestId)
          console.log(requestId === returnId)
          console.log(toolInvocation)
      try {
        //@ts-expect-error
        const result = JSON.parse(toolInvocation?.toolInvocation?.result ?? {});
        console.log(result)
        console.log(result.state.smc_simulation_config)
        setConfig(result.state.smc_simulation_config ?? null);
      } catch {
        logError(
          "Failed to parse tool invocation result as JSON:",
          //@ts-expect-error
          toolInvocation.toolInvocation.result,
        );
      }
    }
  }, [chat.messages, setConfig]);

  useEffect(() => {
    setIsChatReady(chat.status === "ready");
  }, [chat.status, setIsChatReady]);

  return {
    messages: chat.messages,
    append: (
      message: Message | CreateMessage,
      chatRequestOptions?: ChatRequestOptions,
    ) => {
      // Generate a new requestId for each request
      setRequestId(crypto.randomUUID().replace(/-/g, ""));
      
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
          logError("Unable to rename the thread:", ex);
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
  const defaultConfig = useDefaultConfig("CircuitSimulationScanConfig");

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

  // This callback is no longer needed since requestId is managed in useServiceAiAgentChat
  return useCallback(() => {
    // No-op: requestId is now generated per request in append()
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
