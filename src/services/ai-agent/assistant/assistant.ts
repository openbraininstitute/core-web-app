/* eslint-disable react-hooks/rules-of-hooks */
import React from 'react';
import debounce from 'es-toolkit/compat/debounce';
import { Message } from '@ai-sdk/react';

import { serviceAiAgentThreadDelete, serviceAiAgentThreadRename } from '../api';
import { Signal } from './signal';
import { AiAssistantHistory, AssistantContext, AssistantError } from './types';
import { ThreadManager } from './manager/thread';
import { HistoryManager } from './manager/history';
import { MessageManager } from './manager/message';

import { useAccessToken } from '@/hooks/useAccessToken';
import { useParamProjectId, useParamVirtualLabId } from '@/util/params';
import { useAppNotification } from '@/components/notification';
import { logError } from '@/util/logger';

class AiAssistantClass {
  public readonly threadId = new Signal<string | undefined>(undefined);

  public readonly initialMessages = new Signal<Message[]>([]);

  public readonly error = new Signal<AssistantError>(null);

  public readonly history = new Signal<AiAssistantHistory>([]);

  private readonly accessToken = new Signal('NO-TOKEN');

  private readonly virtualLabId = new Signal<string | null>(null);

  private readonly projectId = new Signal<string | null>(null);

  private readonly threadmanager = new ThreadManager(this);

  private readonly historyManager = new HistoryManager(this);

  private readonly messageManager = new MessageManager(this);

  constructor() {
    this.accessToken.event.addListener(this.handleInit);
    this.virtualLabId.event.addListener(this.handleInit);
    this.projectId.event.addListener(this.handleInit);
    this.threadId.event.addListener((threadId: string | undefined) => {
      if (!threadId) return;

      this.messageManager.loadMessages(this.context, threadId);
    });
  }

  init({ accessToken, virtualLabId, projectId }: AssistantContext) {
    this.accessToken.set(accessToken);
    this.virtualLabId.set(virtualLabId);
    this.projectId.set(projectId);
  }

  readonly createThread = async () => {
    const threadId = await this.threadmanager.createThread();
    this.historyManager.reset();
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
  ] {
    const history = this.history.useValue();
    const threadId = this.threadId.useValue();
    const context = this.useContext();

    React.useEffect(() => {
      if (threadId) this.historyManager.start(context, threadId);
      return () => {
        this.historyManager.stop();
      };
    }, [threadId, context]);

    return [history, this.historyManager.hasMore, () => this.historyManager.next(context)];
  }

  useContext() {
    const accessToken = this.accessToken.useValue();
    const virtualLabId = this.virtualLabId.useValue();
    const projectId = this.projectId.useValue();
    const [context, setContext] = React.useState<AssistantContext>({
      accessToken,
      virtualLabId,
      projectId,
    });

    React.useEffect(() => {
      setContext({ accessToken, virtualLabId, projectId });
    }, [accessToken, virtualLabId, projectId]);

    return context;
  }

  private get context(): AssistantContext {
    return {
      accessToken: this.accessToken.get(),
      virtualLabId: this.virtualLabId.get(),
      projectId: this.projectId.get(),
    };
  }

  private readonly handleInit = debounce(() => {
    this.threadmanager.init(this.context);
  }, 50);
}

const AiAssistant = new AiAssistantClass();

export function useAiAssistant(): Omit<AiAssistantClass, 'init' | 'history' | 'error'> {
  const { error } = useAppNotification();
  const accessToken = useAccessToken() ?? 'NO-TOKEN';
  const virtualLabId = useParamVirtualLabId();
  const projectId = useParamProjectId();

  React.useEffect(() => {
    const handleError = (err: AssistantError) => {
      if (!err) return;

      const { message, reason } = err;
      logError('Error in AI Assistant!', message, reason);
      error({ message });
    };
    AiAssistant.error.event.addListener(handleError);
    return () => AiAssistant.error.event.removeListener(handleError);
  }, [error]);
  React.useEffect(() => {
    AiAssistant.init({ accessToken, virtualLabId, projectId });
  }, [accessToken, virtualLabId, projectId]);

  return AiAssistant;
}
