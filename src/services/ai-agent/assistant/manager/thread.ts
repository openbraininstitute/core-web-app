import { serviceAiAgentThreadCreate } from '../../api';

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
   * The first time we open the AI Assistant, we create a new thread.
   */
  readonly init = async (context: AssistantContext) => {
    this.context = context;
    await this.createThread();
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
    return threadId;
  };
}
