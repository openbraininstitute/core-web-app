import { Message } from '@ai-sdk/react';

import { serviceAiAgentThreadMessages } from '../../api';
import { Signal } from '../signal';
import { AssistantContext } from '../types';

export class MessageManager {
  constructor(
    private readonly target: {
      initialMessages: Signal<Message[]>;
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
    const resp = await serviceAiAgentThreadMessages({
      accessToken,
      virtualLabId,
      projectId,
      threadId,
    });
    const initialMessages = resp.results.reverse();
    this.target.initialMessages.set(initialMessages);
  };
}
