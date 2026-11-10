'use client';

import { SendOutlined } from '@ant-design/icons';
import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { sendTyping } from './hooks';

import type { ChatUser } from './api';

/** "@" and the letters after it, just before the caret: what the person is picking someone by. */
const MENTION_QUERY = /(^|\s)@([\p{L}\p{N}._'-]*)$/u;
/** A "typing" goes out at most this often. */
const TYPING_EVERY_MS = 3000;

/** "@Name" for each person picked, as the mention link the server reads; longest names first. */
export function withMentionLinks(text: string, picked: ChatUser[]) {
  let body = text;
  for (const p of [...picked].sort((a, b) => b.name.length - a.name.length)) {
    body = body.split(`@${p.name}`).join(`[@${p.name}](mention:${p.id})`);
  }
  return body;
}

/** The other way, for editing a message: its mention links as "@Name", and who they name. */
export function withoutMentionLinks(body: string) {
  const picked: ChatUser[] = [];
  const text = body.replace(/\[@([^\]]*)\]\(mention:([0-9a-f-]{36})\)/g, (_, name, id) => {
    if (!picked.some((p) => p.id === id)) picked.push({ id, name });
    return `@${name}`;
  });
  return { text, picked };
}

/**
 * What is half-written in each conversation (or thread), so switching away, closing the window
 * or moving it loses nothing.
 */
const drafts = new Map<string, { text: string; picked: ChatUser[] }>();

/**
 * The box a message is written in. Enter sends and Shift+Enter starts a new line. "@" offers the
 * conversation's people; a name picked is shown as "@Name" and sent as a mention link.
 */
export function Composer({
  conversationId,
  draftKey = conversationId,
  people,
  placeholder,
  onSend,
}: {
  conversationId: string;
  /** Where its draft is kept: the conversation, or a thread in it. */
  draftKey?: string;
  people: ChatUser[];
  placeholder: string;
  onSend: (body: string) => void;
}) {
  const [text, setTextState] = useState(() => drafts.get(draftKey)?.text ?? '');
  const [picked, setPickedState] = useState<ChatUser[]>(() => drafts.get(draftKey)?.picked ?? []);
  const setText = (next: string) => {
    setTextState(next);
    drafts.set(draftKey, { text: next, picked: drafts.get(draftKey)?.picked ?? picked });
  };
  const setPicked = (update: (list: ChatUser[]) => ChatUser[]) => {
    const next = update(drafts.get(draftKey)?.picked ?? picked);
    setPickedState(next);
    drafts.set(draftKey, { text: drafts.get(draftKey)?.text ?? text, picked: next });
  };
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const lastTyping = useRef(0);

  // grows with what is written, up to a few lines
  // biome-ignore lint/correctness/useExhaustiveDependencies: the text is what changes the height
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  const matches =
    query === null
      ? []
      : people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  const readQuery = (value: string, caret: number) => {
    const m = MENTION_QUERY.exec(value.slice(0, caret));
    setQuery(m ? m[2] : null);
    setHighlight(0);
  };

  const pick = (p: ChatUser) => {
    const el = area.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@[\p{L}\p{N}._'-]*$/u, `@${p.name} `);
    const next = before + text.slice(caret);
    setText(next);
    setPicked((list) => (list.some((x) => x.id === p.id) ? list : [...list, p]));
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(before.length, before.length);
    });
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // each picked name still written as "@Name" goes as a mention
    onSend(withMentionLinks(trimmed, picked));
    setTextState('');
    setPickedState([]);
    drafts.delete(draftKey);
    setQuery(null);
  };

  return (
    <div className="relative">
      {matches.length > 0 && (
        <ul className="border-neutral-2 absolute bottom-full left-0 z-10 mb-2 w-72 overflow-hidden rounded-xl border bg-white py-1 shadow-lg">
          {matches.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(p);
                }}
                className={cn(
                  'text-primary-9 w-full px-3 py-1.5 text-left text-sm',
                  i === highlight ? 'bg-primary-1' : 'hover:bg-neutral-1'
                )}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="border-neutral-2 focus-within:border-primary-4 flex items-end gap-2 rounded-2xl border bg-white py-2 pr-2 pl-4 transition-colors">
        <textarea
          ref={area}
          rows={1}
          value={text}
          placeholder={placeholder}
          aria-label="Message"
          onChange={(e) => {
            setText(e.target.value);
            readQuery(e.target.value, e.target.selectionStart);
            if (Date.now() - lastTyping.current > TYPING_EVERY_MS) {
              lastTyping.current = Date.now();
              sendTyping(conversationId);
            }
          }}
          onKeyDown={(e) => {
            if (matches.length > 0) {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const step = e.key === 'ArrowDown' ? 1 : -1;
                setHighlight((h) => (h + step + matches.length) % matches.length);
                return;
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                pick(matches[highlight] ?? matches[0]);
                return;
              }
              if (e.key === 'Escape') {
                setQuery(null);
                return;
              }
            }
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          onClick={(e) => readQuery(text, e.currentTarget.selectionStart)}
          className="text-primary-9 placeholder:text-neutral-3 max-h-[200px] min-h-6 flex-1 resize-none bg-transparent py-1 text-[15px] leading-6 outline-none"
        />
        <button
          type="button"
          onClick={send}
          disabled={!text.trim()}
          aria-label="Send"
          className="bg-primary-9 hover:bg-primary-8 flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40"
        >
          <SendOutlined />
        </button>
      </div>
    </div>
  );
}
