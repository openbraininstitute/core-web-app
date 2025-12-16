import { serviceAiAgentThreadMessages } from '../../api';
import { Signal } from '../signal';
import { AiMessage, AssistantContext } from '../types';
import { logError } from '@/util/logger';

export class MessageManager {
  constructor(
    private readonly target: {
      initialMessages: Signal<AiMessage[]>;
    }
  ) {}

  /**
   * When the user select a thread, we need to display
   * all the messages of this thread. not only the new ones.
   */
  readonly loadMessages = async (context: AssistantContext, threadId: string) => {
    const { target } = this;
    const { accessToken, virtualLabId, projectId } = context;
    target.initialMessages.set([]);
    try {
      const resp = await serviceAiAgentThreadMessages({
        accessToken,
        virtualLabId,
        projectId,
        threadId,
      });
      const initialMessages = resp.results.reverse();
      this.target.initialMessages.set(initialMessages);
    } catch (ex) {
      logError('Unable to load thread initial messages!', ex);
    }
  };
}
