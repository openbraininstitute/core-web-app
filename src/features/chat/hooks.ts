'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { CHAT_URL, chatFetch } from './api';

import type { ChatMessage, ChatUser, Conversation, SearchResult } from './api';

export const chatKeys = {
  conversations: ['chat', 'conversations'] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
  thread: (id: string, rootId: string) => ['chat', 'thread', id, rootId] as const,
  search: (term: string) => ['chat', 'search', term] as const,
  members: (id: string) => ['chat', 'members', id] as const,
  people: ['chat', 'people'] as const,
};

type Page = { messages: ChatMessage[]; more: boolean };
export type Thread = { root: ChatMessage; replies: ChatMessage[] };

export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations,
    queryFn: () => chatFetch<{ conversations: Conversation[] }>('/conversations'),
    select: (r) => r.conversations,
    enabled: !!CHAT_URL,
    staleTime: 30_000,
  });
}

/** Unread messages across every conversation, and how many of them mention you. */
export function useUnreadTotals() {
  const { data } = useConversations();
  return (data ?? []).reduce(
    (t, c) => ({ unread: t.unread + c.unread, mentions: t.mentions + c.mentions }),
    { unread: 0, mentions: 0 }
  );
}

export function useMessages(id: string | undefined) {
  return useQuery({
    queryKey: chatKeys.messages(id ?? ''),
    queryFn: () => chatFetch<Page>(`/conversations/${encodeURIComponent(id ?? '')}/messages`),
    enabled: !!CHAT_URL && !!id,
    staleTime: Infinity,
  });
}

/** Fetches the page before the oldest message loaded and puts it in front. */
export function useLoadOlder(id: string) {
  const qc = useQueryClient();
  return useCallback(async () => {
    const current = qc.getQueryData<Page>(chatKeys.messages(id));
    const oldest = current?.messages.find((m) => !m.pending)?.id;
    if (!oldest) return;
    const older = await chatFetch<Page>(
      `/conversations/${encodeURIComponent(id)}/messages?before=${oldest}`
    );
    qc.setQueryData<Page>(chatKeys.messages(id), (page) =>
      page ? { messages: [...older.messages, ...page.messages], more: older.more } : page
    );
  }, [qc, id]);
}

export function useMembers(id: string | undefined) {
  return useQuery({
    queryKey: chatKeys.members(id ?? ''),
    queryFn: () =>
      chatFetch<{ members: ChatUser[] }>(`/conversations/${encodeURIComponent(id ?? '')}`),
    select: (r) => r.members,
    enabled: !!CHAT_URL && !!id,
    staleTime: 5 * 60_000,
  });
}

export function usePeople(enabled = true) {
  return useQuery({
    queryKey: chatKeys.people,
    queryFn: () => chatFetch<{ people: ChatUser[] }>('/people'),
    select: (r) => r.people,
    enabled: !!CHAT_URL && enabled,
    staleTime: 5 * 60_000,
  });
}

export function useThread(id: string, rootId: string | null) {
  return useQuery({
    queryKey: chatKeys.thread(id, rootId ?? ''),
    queryFn: () => chatFetch<Thread>(`/conversations/${encodeURIComponent(id)}/threads/${rootId}`),
    enabled: !!CHAT_URL && !!rootId,
    staleTime: Infinity,
  });
}

/** Messages matching the words, across every conversation you can read. */
export function useSearch(term: string) {
  const trimmed = term.trim();
  return useQuery({
    queryKey: chatKeys.search(trimmed),
    queryFn: () =>
      chatFetch<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(trimmed)}`),
    select: (r) => r.results,
    enabled: !!CHAT_URL && trimmed.length >= 2,
    staleTime: 10_000,
  });
}

/** Replaces a message wherever it is held: a conversation's page, a thread's root or replies. */
export function applyUpdate(qc: ReturnType<typeof useQueryClient>, message: ChatMessage) {
  const swap = (m: ChatMessage) => (m.id === message.id ? message : m);
  qc.setQueryData<Page>(chatKeys.messages(message.conversationId), (page) =>
    page ? { ...page, messages: page.messages.map(swap) } : page
  );
  for (const [key] of qc.getQueriesData<Thread>({
    queryKey: ['chat', 'thread', message.conversationId],
  })) {
    qc.setQueryData<Thread>(key, (t) =>
      t ? { root: swap(t.root), replies: t.replies.map(swap) } : t
    );
  }
}

/** Puts a reply into its thread once, whether it is new or replaces its draft. */
export function mergeReply(thread: Thread | undefined, message: ChatMessage): Thread | undefined {
  if (!thread) return thread;
  const merged = mergeMessage({ messages: thread.replies, more: false }, message);
  return merged ? { ...thread, replies: merged.messages } : thread;
}

/** Puts a message into a conversation's page once, whether it is new or replaces its draft. */
export function mergeMessage(page: Page | undefined, message: ChatMessage): Page | undefined {
  if (!page) return page;
  const at = page.messages.findIndex(
    (m) => m.id === message.id || (!!message.clientId && m.clientId === message.clientId)
  );
  if (at < 0) return { ...page, messages: [...page.messages, message] };
  const messages = [...page.messages];
  messages[at] = message;
  return { ...page, messages };
}

/**
 * Sends a message: it shows at once as pending, under an id of the browser's making, and the
 * server's copy replaces it; the same id makes a retry the same message.
 */
export function useSendMessage(id: string, me: ChatUser | undefined, threadId?: string) {
  const qc = useQueryClient();
  return useCallback(
    async (body: string) => {
      const clientId = crypto.randomUUID();
      const draft: ChatMessage = {
        id: `~${clientId}`,
        conversationId: id,
        threadId: threadId ?? null,
        sender: me ?? { id: '', name: 'You' },
        body,
        mentions: [],
        clientId,
        createdAt: Date.now(),
        editedAt: null,
        deleted: false,
        reactions: [],
        pending: true,
      };
      // into the thread it is a reply in, or the conversation
      const put = (message: ChatMessage) =>
        threadId
          ? qc.setQueryData<Thread>(chatKeys.thread(id, threadId), (t) => mergeReply(t, message))
          : qc.setQueryData<Page>(chatKeys.messages(id), (page) => mergeMessage(page, message));
      put(draft);
      const attempt = () =>
        chatFetch<{ message: ChatMessage }>(`/conversations/${encodeURIComponent(id)}/messages`, {
          body: { clientId, body, ...(threadId ? { threadId } : {}) },
        });
      try {
        const { message } = await attempt().catch(attempt);
        put(message);
        qc.invalidateQueries({ queryKey: chatKeys.conversations });
      } catch (e) {
        put({ ...draft, pending: false, failed: true, error: (e as Error).message });
      }
    },
    [qc, id, me, threadId]
  );
}

/** Reacting (a second time takes it back), editing and deleting a message of a conversation. */
export function useMessageActions(id: string) {
  const qc = useQueryClient();
  const act = useCallback(
    async (messageId: string, action: 'react' | 'edit' | 'delete', body: object = {}) => {
      const { message } = await chatFetch<{ message: ChatMessage }>(
        `/conversations/${encodeURIComponent(id)}/messages/${messageId}/${action}`,
        { body }
      );
      applyUpdate(qc, message);
      if (action !== 'react') qc.invalidateQueries({ queryKey: chatKeys.conversations });
      return message;
    },
    [qc, id]
  );
  return {
    react: (messageId: string, emoji: string) => act(messageId, 'react', { emoji }),
    edit: (messageId: string, body: string) => act(messageId, 'edit', { body }),
    remove: (messageId: string) => act(messageId, 'delete'),
  };
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useCallback(
    async (id: string, messageId: string) => {
      await chatFetch(`/conversations/${encodeURIComponent(id)}/read`, { body: { messageId } });
      qc.setQueryData<{ conversations: Conversation[] }>(chatKeys.conversations, (r) =>
        r
          ? {
              conversations: r.conversations.map((c) =>
                c.id === id ? { ...c, unread: 0, mentions: 0 } : c
              ),
            }
          : r
      );
    },
    [qc]
  );
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { kind: 'direct' | 'group'; userIds: string[]; title?: string }) =>
      chatFetch<{ id: string; existed: boolean }>('/conversations', { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.conversations }),
  });
}

export function sendTyping(id: string) {
  return chatFetch(`/conversations/${encodeURIComponent(id)}/typing`, { body: {} }).catch(
    () => undefined
  );
}
