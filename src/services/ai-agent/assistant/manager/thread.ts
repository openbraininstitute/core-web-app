import { sharedSessionStorage } from '@/util/shared-session-storage';

import { serviceAiAgentThreadCreate, serviceAiAgentThreadExists } from '../../api';

import type { Signal } from '../signal';
import type { AssistantContext } from '../types';

export class ThreadManager {
  constructor(
    readonly _target: {
      threadId: Signal<string | undefined>;
    }
  ) {}

  /**
   * The first time we open the AI Assistant, we try to get the
   * last recently used thread stored in session storage.
   * If no such thread exists, we create a new one.
   */
  readonly init = async (context: AssistantContext) => {
    this.context = context;
    const { target } = this;
    const { accessToken } = context;
    const sessionThreadId = await this.recoverLastThreadId(accessToken);
    if (sessionThreadId) {
      target.threadId.set(sessionThreadId);
    } else {
      await this.createThread();
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
}
