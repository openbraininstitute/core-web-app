/* eslint-disable react-hooks/rules-of-hooks */

import { useQueryClient } from '@tanstack/react-query';
import debounce from 'es-toolkit/compat/debounce';
import React from 'react';

import { notify } from '@/components/notification';
import { useAccessToken } from '@/hooks/useAccessToken';
import { keyBuilderAI } from '@/ui/use-query-keys/ai-assistant';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { logError, logWarn } from '@/utils/logger';

import { serviceAiAgentThreadDelete, serviceAiAgentThreadRename } from '../api';
import { useAiAgentHealthCheck } from '../hooks/health';
import { ChatManager } from './manager/chat';
import { HistoryManager } from './manager/history';
import { MessageManager } from './manager/message';
import { ThreadManager } from './manager/thread';
import { Signal } from './signal';

import type { UIMessage } from '@ai-sdk/react';
import type { AiAssistantHistory, AssistantContext, AssistantError } from './types';

class AiAssistantClass {
  public readonly threadId = new Signal<string | undefined>(undefined);

  public readonly initialMessages = new Signal<UIMessage[]>([]);

  public readonly isLoadingMessages = new Signal<boolean>(false);

  public readonly isLoadingHistory = new Signal<boolean>(false);

  public readonly error = new Signal<AssistantError>(null);

  public readonly healthError = new Signal<string | null>(null);

  public readonly history = new Signal<AiAssistantHistory>([]);

  public readonly isEmptyThread = new Signal<boolean>(false);

  private readonly accessToken = new Signal('NO-TOKEN');

  private readonly virtualLabId = new Signal<string | null>(null);

  private readonly projectId = new Signal<string | null>(null);

  public readonly chat = new ChatManager();

  private readonly threadmanager = new ThreadManager(this);

  private readonly historyManager = new HistoryManager(this);

  private readonly messageManager = new MessageManager(this);

  setQueryClient(queryClient: ReturnType<typeof useQueryClient>) {
    this.messageManager.queryClient = queryClient;
    this.historyManager.queryClient = queryClient;
  }

  constructor() {
    this.accessToken.event.addListener(this.handleInit);
    this.virtualLabId.event.addListener(this.handleInit);
    this.projectId.event.addListener(this.handleInit);
    this.threadId.event.addListener((threadId: string | undefined) => {
      if (!threadId) {
        this.initialMessages.set([]);
        this.isLoadingMessages.set(false);
        this.isEmptyThread.set(false);
        return;
      }

      // Skip loading messages if thread is marked as empty
      if (this.isEmptyThread.get()) {
        this.initialMessages.set([]);
        this.isLoadingMessages.set(false);
        return;
      }

      this.isLoadingMessages.set(true);
      this.messageManager.loadMessages(this.context, threadId).finally(() => {
        this.isLoadingMessages.set(false);
      });
    });
  }

  init({ accessToken, virtualLabId, projectId }: AssistantContext) {
    this.accessToken.set(accessToken);
    this.virtualLabId.set(virtualLabId);
    this.projectId.set(projectId);
  }

  readonly createThread = async () => {
    const { threadId, isEmpty } = await this.threadmanager.createThread();
    this.isEmptyThread.set(isEmpty);
    this.initialMessages.set([]);
    this.threadId.set(threadId);
    return threadId;
  };

  async renameThread(threadId: string, title: string) {
    const history = this.history.get().slice();
    const index = history.findIndex((item) => item.id === threadId);
    if (index !== -1) {
      history[index] = {
        ...history[index],
        title,
      };
      this.history.set(history);
    }
    await serviceAiAgentThreadRename({
      ...this.context,
      threadId,
      title,
    });
  }

  async deleteThread(threadId: string) {
    const history = this.history.get().filter((item) => item.id !== threadId);
    this.history.set(history);
    await serviceAiAgentThreadDelete({
      ...this.context,
      threadId,
    });
  }

  useHistory(): [
    history: AiAssistantHistory,
    hasMore: boolean,
    fetchNextPage: () => Promise<void>,
    isLoading: boolean,
  ] {
    const history = this.history.useValue();
    const accessToken = this.accessToken.useValue();
    const virtualLabId = this.virtualLabId.useValue();
    const projectId = this.projectId.useValue();
    const [isLoading, setIsLoading] = React.useState(true);
    const hasStarted = React.useRef(false);

    React.useEffect(() => {
      if (hasStarted.current) return;
      hasStarted.current = true;

      const context = { accessToken, virtualLabId, projectId };
      setIsLoading(true);
      this.historyManager.start(context).finally(() => {
        setIsLoading(false);
      });

      return () => {
        this.historyManager.stop();
      };
    }, []);

    return [
      history,
      this.historyManager.hasMore,
      () => this.historyManager.next({ accessToken, virtualLabId, projectId }),
      isLoading,
    ];
  }

  private get context(): AssistantContext {
    return {
      accessToken: this.accessToken.get(),
      virtualLabId: this.virtualLabId.get(),
      projectId: this.projectId.get(),
    };
  }

  private readonly handleInit = debounce(() => {
    this.threadmanager
      .init(this.context)
      .then(({ isEmpty }) => {
        this.isEmptyThread.set(isEmpty);
      })
      .catch((err: unknown) => {
        logWarn('AI assistant thread init failed (handled):', err);
        this.healthError.set(
          err instanceof Error ? err.message : 'Failed to initialize AI assistant.'
        );
      });
  }, 50);
}

export const AiAssistant = new AiAssistantClass();

export function useAiAssistant() {
  const queryClient = useQueryClient();
  const accessToken = useAccessToken() ?? 'NO-TOKEN';
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();
  const { error: healthError } = useAiAgentHealthCheck(accessToken);

  React.useEffect(() => {
    if (healthError) {
      AiAssistant.healthError.set(healthError);
    }
  }, [healthError]);

  React.useEffect(() => {
    const handleError = (err: AssistantError) => {
      if (!err) return;

      const { message, reason } = err;
      logError('Error in AI Assistant!', message, reason);
      notify.error({ title: 'AI Assistant error', description: message });
    };
    AiAssistant.error.event.addListener(handleError);
    return () => AiAssistant.error.event.removeListener(handleError);
  }, []);

  React.useEffect(() => {
    AiAssistant.init({ accessToken, virtualLabId, projectId });
    AiAssistant.setQueryClient(queryClient);
  }, [accessToken, virtualLabId, projectId, queryClient]);

  return {
    ...AiAssistant,
    useHistory: AiAssistant.useHistory.bind(AiAssistant),
    renameThread: async (threadId: string, title: string) => {
      await AiAssistant.renameThread(threadId, title);
      queryClient.invalidateQueries({ queryKey: keyBuilderAI.history(virtualLabId, projectId) });
    },
    deleteThread: async (threadId: string) => {
      const isCurrentThread = AiAssistant.threadId.get() === threadId;

      if (isCurrentThread) {
        AiAssistant.threadId.set(undefined);
        AiAssistant.initialMessages.set([]);
      }

      await AiAssistant.deleteThread(threadId);
      queryClient.invalidateQueries({ queryKey: keyBuilderAI.history(virtualLabId, projectId) });
      queryClient.invalidateQueries({
        queryKey: keyBuilderAI.messages(threadId, virtualLabId, projectId),
      });

      if (isCurrentThread) {
        await AiAssistant.createThread();
      }
    },
    createThread: async () => {
      const threadId = await AiAssistant.createThread();
      queryClient.invalidateQueries({ queryKey: keyBuilderAI.history(virtualLabId, projectId) });
      return threadId;
    },
  };
}
