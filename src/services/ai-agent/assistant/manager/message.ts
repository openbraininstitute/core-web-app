import type { Message } from '@ai-sdk/react';
import { logError } from '@/util/logger';
import { serviceAiAgentThreadMessages } from '../../api';
import type { Signal } from '../signal';
import type { AssistantContext } from '../types';

export class MessageManager {
  constructor(
    private readonly target: {
      initialMessages: Signal<Message[]>;
    }
  ) {}

  /**
   * When the user select a thread, we need to display
   * all the messages of this thread. not only the new ones.
   *
   * @deprecated Use useThreadMessages() React Query hook instead
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
