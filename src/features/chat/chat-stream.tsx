'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { CHAT_URL, chatFetch, chatToken } from './api';
import { applyUpdate, chatKeys, mergeMessage, mergeReply } from './hooks';

import type { ReactNode } from 'react';
import type { ChatMessage, ChatUser } from './api';
import type { Thread } from './hooks';

type Page = { messages: ChatMessage[]; more: boolean };
type Typing = Record<string, { user: ChatUser; until: number }[]>;

type ChatStream = {
  me: ChatUser | undefined;
  connected: boolean;
  /** Who is typing where, for the next few seconds. */
  typing: Typing;
};

const ChatStreamContext = createContext<ChatStream>({
  me: undefined,
  connected: false,
  typing: {},
});

export const useChatStream = () => useContext(ChatStreamContext);

type ChatEvent =
  | { type: 'hello'; user: ChatUser }
  | { type: 'message'; message: ChatMessage }
  | { type: 'updated'; message: ChatMessage }
  | { type: 'typing'; conversationId: string; user: ChatUser }
  | { type: 'conversation'; id?: string }
  | { type: 'read'; conversationId: string };

/** How long a "typing" is shown without another. */
const TYPING_MS = 5000;
/** A stream is opened again this often, so it carries a token that has not expired. */
const RENEW_MS = 10 * 60_000;

/**
 * One event stream per tab from the chat server: new messages go into the pages of messages
 * already loaded, and the conversation list (its unread counts) is fetched again.
 *
 * It is read with fetch rather than EventSource, so the token goes in a header, not the URL.
 */
export function ChatStreamProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [me, setMe] = useState<ChatUser>();
  const [connected, setConnected] = useState(false);
  const [typing, setTyping] = useState<Typing>({});

  useEffect(() => {
    if (!CHAT_URL) return;
    let stopped = false;
    let controller: AbortController | null = null;
    let renew: ReturnType<typeof setTimeout> | undefined;

    const onEvent = (event: ChatEvent) => {
      if (event.type === 'hello') setMe(event.user);
      if (event.type === 'updated') applyUpdate(qc, event.message);
      if (event.type === 'message') {
        const m = event.message;
        // a reply goes to its thread, if that is open; the rest to the conversation
        if (m.threadId) {
          qc.setQueryData<Thread>(chatKeys.thread(m.conversationId, m.threadId), (t) =>
            mergeReply(t, m)
          );
        } else {
          qc.setQueryData<Page>(chatKeys.messages(m.conversationId), (page) =>
            mergeMessage(page, m)
          );
        }
        qc.invalidateQueries({ queryKey: chatKeys.conversations });
        // a message ends its sender's "typing"
        setTyping((t) => ({
          ...t,
          [event.message.conversationId]: (t[event.message.conversationId] ?? []).filter(
            (x) => x.user.id !== event.message.sender.id
          ),
        }));
      }
      if (event.type === 'conversation' || event.type === 'read') {
        qc.invalidateQueries({ queryKey: chatKeys.conversations });
      }
      if (event.type === 'typing') {
        const until = Date.now() + TYPING_MS;
        setTyping((t) => ({
          ...t,
          [event.conversationId]: [
            ...(t[event.conversationId] ?? []).filter((x) => x.user.id !== event.user.id),
            { user: event.user, until },
          ],
        }));
      }
    };

    // after a reconnection, each conversation loaded gets what it missed, and the counts again
    let renewed = false;
    const catchUp = () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversations });
      for (const [key, page] of qc.getQueriesData<Page>({ queryKey: ['chat', 'messages'] })) {
        const id = key[2] as string;
        const newest = page?.messages.filter((m) => !m.pending).at(-1)?.id;
        if (!id || !newest) continue;
        chatFetch<Page>(`/conversations/${encodeURIComponent(id)}/messages?after=${newest}`)
          .then(({ messages }) => {
            for (const message of messages) {
              if (message.threadId) continue;
              qc.setQueryData<Page>(key, (p) => mergeMessage(p, message));
            }
          })
          .catch(() => undefined);
      }
    };

    // failed tries in a row, for the wait before the next
    let failures = 0;
    const open = async () => {
      if (stopped) return;
      controller = new AbortController();
      clearTimeout(renew);
      renew = setTimeout(() => controller?.abort(), RENEW_MS);
      try {
        const res = await fetch(`${CHAT_URL}/api/events`, {
          headers: { Authorization: `Bearer ${await chatToken()}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`The chat stream answered ${res.status}`);
        setConnected(true);
        if (failures > 0 || renewed) catchUp();
        failures = 0;
        renewed = true;
        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += value;
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const chunk of events) {
            const data = chunk
              .split('\n')
              .filter((line) => line.startsWith('data: '))
              .map((line) => line.slice(6))
              .join('\n');
            if (data) onEvent(JSON.parse(data));
          }
        }
      } catch {
        // closed, renewed or refused: opened again below
      }
      setConnected(false);
      if (stopped) return;
      setTimeout(open, Math.min(30_000, 1000 * 2 ** failures));
      failures += 1;
    };
    open();

    // "typing" fades by itself
    const sweep = setInterval(() => {
      setTyping((t) => {
        const now = Date.now();
        let changed = false;
        const next: Typing = {};
        for (const [id, list] of Object.entries(t)) {
          const kept = list.filter((x) => x.until > now);
          if (kept.length !== list.length) changed = true;
          if (kept.length) next[id] = kept;
        }
        return changed ? next : t;
      });
    }, 1000);

    return () => {
      stopped = true;
      clearTimeout(renew);
      clearInterval(sweep);
      controller?.abort();
    };
  }, [qc]);

  const value = useMemo(() => ({ me, connected, typing }), [me, connected, typing]);
  return <ChatStreamContext.Provider value={value}>{children}</ChatStreamContext.Provider>;
}
