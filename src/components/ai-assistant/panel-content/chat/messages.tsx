import { MessageItem } from '../../message-item';

import type { UIMessage } from '@ai-sdk/react';

export function Messages({ messages }: { messages: UIMessage[] }) {
  return (
    <div>
      {messages.map((item) => (
        <MessageItem key={item.id} value={item} />
      ))}
    </div>
  );
}
