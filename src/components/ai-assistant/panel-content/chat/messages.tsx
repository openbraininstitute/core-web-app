import { MessageItem } from '../../message-item';
import { AiMessage } from '@/services/ai-agent/assistant/types';

export function Messages({ messages }: { messages: AiMessage[] }) {
  return (
    <div>
      {messages.map((item) => (
        <MessageItem key={item.id} value={item} />
      ))}
    </div>
  );
}
