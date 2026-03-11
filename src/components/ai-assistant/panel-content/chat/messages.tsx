import { MessageItem } from '../../message-item';
import { configStateAtom } from '@/services/ai-agent/hooks/chat';

import type { UIMessage } from '@ai-sdk/ui-utils';

export function Messages({ messages }: { messages: UIMessage[] }) {
  return (
    <div>
      {messages.map((item) => (
        <MessageItem key={item.id} value={item} />
      ))}
    </div>
  );
}
