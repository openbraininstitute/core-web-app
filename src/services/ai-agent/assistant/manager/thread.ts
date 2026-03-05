import { serviceAiAgentThreadCreate, serviceAiAgentThreadList } from '../../api';

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
    const { threadId, isEmpty } = await this.createThread();
    this.target.threadId.set(threadId);
    return { threadId, isEmpty };
  };

  readonly createThread = async () => {
    const { context } = this;
    if (!context) throw new Error('ThreadManager has not been initialized yet!');

    const lastThread = await serviceAiAgentThreadList({
      ...context,
      pageSize: 1,
      excludeEmptyThreads: false,
    });

    if (lastThread.results.length > 0) {
      const thread = lastThread.results[0];

      // Compare up to milliseconds
      if (new Date(thread.creation_date).getTime() === new Date(thread.update_date).getTime()) {
        return { threadId: thread.thread_id, isEmpty: true };
      }
    }

    const params = {
      ...context,
      title: new Date().toUTCString(),
    };
    const thread = await serviceAiAgentThreadCreate(params);
    const { threadId } = thread;
    return { threadId, isEmpty: true };
  };
}
