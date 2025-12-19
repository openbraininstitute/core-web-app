import type { UIMessage } from '@ai-sdk/ui-utils';
import { MessageItem } from '../../message-item';

export function Messages({ messages }: { messages: UIMessage[] }) {
  return (
    <div>
      {messages.map((item) => (
        <MessageItem key={item.id} value={item} />
      ))}
    </div>
  );
}
