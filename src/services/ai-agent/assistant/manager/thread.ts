import { serviceAiAgentThreadCreate } from '../../api';
import { Signal } from '../signal';
import { AssistantContext } from '../types';

export class ThreadManager {
  constructor(
    private readonly target: {
      threadId: Signal<string | undefined>;
    }
  ) {}

  /**
   * The first time we open the AI Assistant, we try to get the
   * last recently used thread. If no such thread exists, we
   * create  new one.
   */
  readonly init = async (context: AssistantContext) => {
    const { target } = this;
    const { accessToken, virtualLabId, projectId } = context;
    // We comment this out for the moment, but we will need to bring it back soon.
    // target.threadId.set(undefined);
    // const threads = await serviceAiAgentThreadList({
    //   accessToken,
    //   virtualLabId,
    //   projectId,
    //   pageSize: 1,
    //   excludeEmptyThreads: false,
    // });
    // const [result] = threads.results;
    // if (result) {
    //   target.threadId.set(result.thread_id);
    // } else {
    const thread = await serviceAiAgentThreadCreate({
      accessToken,
      virtualLabId,
      projectId,
      title: new Date().toUTCString(),
    });
    target.threadId.set(thread.threadId);
    // }
  };
}
