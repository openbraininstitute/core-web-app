import { serviceAiAgentThreadCreate, serviceAiAgentThreadList } from '../../api';
import { Signal } from '../signal';
import { AssistantContext } from '../types';

export class ThreadManager {
  private context: AssistantContext | null = null;

  constructor(
    private readonly target: {
      threadId: Signal<string | undefined>;
    }
  ) {}

  /**
   * The first time we open the AI Assistant, we try to get the
   * last recently used thread store in session storage.
   * If no such thread exists, we create a new one.
   */
  readonly init = async (context: AssistantContext) => {
    this.context = context;
    const { target } = this;
    const { accessToken, virtualLabId, projectId } = context;
    target.threadId.set(undefined);
    const threads = await serviceAiAgentThreadList({
      accessToken,
      virtualLabId,
      projectId,
      pageSize: 1,
      excludeEmptyThreads: false,
    });
    const [result] = threads.results;
    const sessionThreadId = globalThis.sessionStorage.getItem('AI-Assistant/threadId') ?? '';
    if (result && result.thread_id === sessionThreadId) {
      target.threadId.set(result.thread_id);
      globalThis.sessionStorage.setItem('AI-Assistant/threadId', result.thread_id);
    } else {
      const thread = await serviceAiAgentThreadCreate({
        accessToken,
        virtualLabId,
        projectId,
        title: new Date().toUTCString(),
      });
      target.threadId.set(thread.threadId);
      globalThis.sessionStorage.setItem('AI-Assistant/threadId', thread.threadId);
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
    return threadId;
  };
}
