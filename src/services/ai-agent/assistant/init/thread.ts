import { serviceAiAgentThreadCreate, serviceAiAgentThreadList } from '../../api';
import { Signal } from '../signal';
import { AssistantContext } from '../types';

export async function initThread(
  context: AssistantContext,
  target: { threadId: Signal<string | undefined> }
) {
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
    setThreadId(target, result.thread_id);
  } else {
    const thread = await serviceAiAgentThreadCreate({
      accessToken,
      virtualLabId,
      projectId,
      title: new Date().toUTCString(),
    });
    setThreadId(target, thread.threadId);
  }
}

async function setThreadId(target: { threadId: Signal<string | undefined> }, threadId: string) {
  target.threadId.set(threadId);
}
