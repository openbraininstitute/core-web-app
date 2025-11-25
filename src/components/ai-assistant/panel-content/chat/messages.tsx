import { UIMessage } from '@ai-sdk/ui-utils';
import { MessageItem } from '../../message-item';

export function Messages({ messages, status }: { messages: UIMessage[]; status: string }) {
  return (
    <div>
      {messages.map((item, messageIndex) => (
        <MessageItem
          key={item.id}
          value={item}
          hideTools={messageIndex === messages.length - 1 && status !== 'ready'}
        />
      ))}
    </div>
  );
}
