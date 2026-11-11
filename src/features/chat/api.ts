import { getSession } from '@/auth-fetch';

/** Where the chat server answers; unset, the platform has no chat. */
export const CHAT_URL = process.env.NEXT_PUBLIC_CHAT_URL;

export type ChatUser = { id: string; name: string };

export type Reaction = { emoji: string; users: ChatUser[] };

export type ChatMessage = {
  id: string;
  conversationId: string;
  /** The message a reply is in the thread of; null in the conversation itself. */
  threadId: string | null;
  sender: ChatUser;
  body: string;
  /** Ids of the people it @-mentions. */
  mentions: string[];
  clientId: string | null;
  createdAt: number;
  editedAt: number | null;
  deleted: boolean;
  reactions: Reaction[];
  /** A message in the conversation itself: how many replies its thread has, and the last's time. */
  replyCount?: number;
  lastReplyAt?: number | null;
  /** Shown before the server has it; `failed` once sending gave up. */
  pending?: boolean;
  failed?: boolean;
  /** Why it was not sent, as the server said. */
  error?: string;
};

export type ConversationKind = 'lab' | 'project' | 'direct' | 'group';

export type Conversation = {
  id: string;
  kind: ConversationKind;
  title: string;
  labId?: string;
  labTitle?: string | null;
  projectId?: string;
  /** Direct and group chats only: lab and project chats are everyone in them. */
  members?: ChatUser[];
  lastMessage: ChatMessage | null;
  unread: number;
  mentions: number;
  /** A lab or project admin may delete anyone's messages in it. */
  canModerate: boolean;
};

export type SearchResult = {
  message: ChatMessage;
  /** The matching words between \u0002 and \u0003. */
  snippet: string;
};

export async function chatToken() {
  return (await getSession())?.accessToken ?? '';
}

export async function chatFetch<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(`${CHAT_URL}/api${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      Authorization: `Bearer ${await chatToken()}`,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `The chat server answered ${res.status}`);
  return body as T;
}

export const projectConversationId = (projectId: string) => `project:${projectId}`;
