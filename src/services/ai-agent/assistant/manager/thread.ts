import { sharedSessionStorage } from '@/util/shared-session-storage';
import {
  serviceAiAgentThreadCreate,
  serviceAiAgentThreadExists,
  serviceAiAgentThreadList,
} from '../../api';
import type { Signal } from '../signal';
import type { AssistantContext } from '../types';

export class ThreadManager {
  private context: AssistantContext | null = null;

  constructor(
    private readonly target: {
      threadId: Signal<string | undefined>;
    }
  ) {}

  /**
   * The first time we open the AI Assistant, we try to get the
   * last recently used thread stored in session storage.
   * If no such thread exists, we load the most recent thread from history.
   */
  readonly init = async (context: AssistantContext) => {
    this.context = context;
    const { target } = this;
    const { accessToken } = context;
    const sessionThreadId = await this.recoverLastThreadId(accessToken);
    if (sessionThreadId) {
      target.threadId.set(sessionThreadId);
    } else {
      const lastThreadId = await this.getLastThreadFromHistory(context);
      if (lastThreadId) {
        target.threadId.set(lastThreadId);
        sharedSessionStorage.setItem('AI-Assistant/threadId', lastThreadId);
      }
    }
  };

  readonly createThread = async () => {
    const { context, target } = this;
    if (!context) throw new Error('ThreadManager has not been initialized yet!');

    const params = {
      ...context,
      title: new Date().toUTCString(),
    };
    const thread = await serviceAiAgentThreadCreate(params);
    const { threadId } = thread;
    target.threadId.set(threadId);
    sharedSessionStorage.setItem('AI-Assistant/threadId', threadId);
    return threadId;
  };

  private async recoverLastThreadId(accessToken: string): Promise<string | null> {
    const sessionThreadId = sharedSessionStorage.getItem('AI-Assistant/threadId') ?? '';
    if (!sessionThreadId) return null;

    // Check thread existence.
    const exists = await serviceAiAgentThreadExists({ accessToken, threadId: sessionThreadId });
    return exists ? sessionThreadId : null;
  }

  private async getLastThreadFromHistory(context: AssistantContext): Promise<string | null> {
    try {
      const { accessToken, projectId, virtualLabId } = context;
      const resp = await serviceAiAgentThreadList({
        accessToken,
        projectId,
        virtualLabId,
        pageSize: 1,
        excludeEmptyThreads: true,
      });
      return resp.results[0]?.thread_id ?? null;
    } catch {
      return null;
    }
  }
}
