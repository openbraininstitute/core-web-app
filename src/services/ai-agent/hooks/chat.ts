import { useSession } from 'next-auth/react';
import { useChat } from '@ai-sdk/react';
import { serviceAiAgentUrl } from '../api';

export function useServiceAiAgentChat(threadId: string) {
  const session = useSession();
  const chat = useChat({
    api: serviceAiAgentUrl('qa/chat_streamed', threadId),
    id: threadId,
    headers: {
      Authorization: `Bearer ${session.data?.accessToken}`,
    },
    body: { tool_selection: ['literature-search-tool', 'web-search-tool'] },
    experimental_prepareRequestBody: ({ messages }) => {
      const lastMessage = messages[messages.length - 1];
      // const selectedTools = Object.keys(checkedTools).filter(
      //   (key) => key !== "allchecked" && checkedTools[key] === true,
      // );
      return { content: lastMessage.content }; // , tool_selection: selectedTools };
    },
  });
  return {
    messages: chat.messages,
    append: chat.append,
    status: chat.status,
    error: chat.error,
  };
}
