import { serviceAiAgentThreadCreate, serviceAiAgentThreadList } from '../../api';
import { Signal } from '../signal';
import { AssistantContext } from '../types';

export class InitializerThread {
  constructor(private readonly target: { threadId: Signal<string | undefined> }) {}

  init = async (context: AssistantContext) => {
    const { target } = this;
    const { accessToken, virtualLabId, projectId } = context;
    target.threadId.set(undefined);
    const threads = await serviceAiAgentThreadList({
      accessToken,
      virtualLabId,
      projectId,
      pageSize: 1,
    });
    const [result] = threads.results;
    if (result) {
      target.threadId.set(result.thread_id);
    } else {
      const thread = await serviceAiAgentThreadCreate({
        accessToken,
        virtualLabId,
        projectId,
        title: new Date().toUTCString(),
      });
      target.threadId.set(thread.threadId);
    }
  };
}
