import { UIMessage } from '@ai-sdk/react';

import { serviceAiAgentThreadMessages } from '../../api';
import { Signal } from '../signal';
import { AssistantContext } from '../types';

export class MessageManager {
  constructor(
    private readonly target: {
      initialMessages: Signal<UIMessage[]>;
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
    const initialMessages = resp.results.reverse().map((msg: any) => {
      // Transform old message format to new UIMessage structure
      if (msg.content && !msg.parts) {
        return {
          ...msg,
          parts: [
            {
              type: 'text',
              text: msg.content,
            },
          ],
        };
      }
      return msg;
    });
    this.target.initialMessages.set(initialMessages);
  };
}
