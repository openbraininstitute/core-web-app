'use client';

import {
  ArrowLeftOutlined,
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  ExperimentOutlined,
  PlusOutlined,
  ProjectOutlined,
  SearchOutlined,
  SmileOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Popconfirm, Popover } from 'antd';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import { projectConversationId } from './api';
import { useChatStream } from './chat-stream';
import { Composer, withMentionLinks, withoutMentionLinks } from './composer';
import {
  useConversations,
  useLoadOlder,
  useMarkRead,
  useMembers,
  useMessageActions,
  useMessages,
  useSearch,
  useSendMessage,
  useThread,
} from './hooks';
import { MessageBody } from './message-body';
import { NewChatDialog } from './new-chat-dialog';

import type { ComponentProps, ReactNode } from 'react';
import type { ChatMessage, ChatUser, Conversation, ConversationKind, SearchResult } from './api';

const KIND_ICON: Record<ConversationKind, ReactNode> = {
  project: <ProjectOutlined />,
  lab: <ExperimentOutlined />,
  direct: <UserOutlined />,
  group: <TeamOutlined />,
};

/** The reactions offered on a message; any other emoji the server takes too. */
const QUICK_REACTIONS = ['👍', '❤️', '😄', '🎉', '👀', '✅'];

const PALETTE = ['#0050b3', '#08979c', '#389e0d', '#d46b08', '#c41d7f', '#531dab', '#cf1322'];
const colourOf = (id: string) =>
  PALETTE[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PALETTE.length];
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '?';

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
const day = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
function when(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return clock(ms);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** A message as one line of plain text, for the list: mentions as @Name, markup gone. */
const plain = (body: string) =>
  body
    .replace(/\[(@[^\]]*)\]\(mention:[^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function Avatar({ user, size = 32 }: { user: ChatUser; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: colourOf(user.id) }}
    >
      {initials(user.name)}
    </span>
  );
}

/** A message to bring into view and flash: one a search found. */
type Focus = { messageId: string; threadId: string | null; at: number };

/**
 * The chat itself, sized by what holds it: the conversations down the left, the one picked on the
 * right. With nothing picked it shows the current project's.
 */
export function ChatPanel({
  selectedId: picked,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { projectId } = useWorkspace();
  const { data: conversations, isLoading, isError, error } = useConversations();
  const [newOpen, setNewOpen] = useState(false);
  const [focus, setFocus] = useState<Focus | null>(null);
  const selectedId = picked ?? projectConversationId(projectId);
  const selected = conversations?.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full min-h-0">
      <ConversationRail
        conversations={conversations}
        loading={isLoading}
        error={isError ? String(error) : undefined}
        selectedId={selectedId}
        projectId={projectId}
        onSelect={(id) => {
          setFocus(null);
          onSelect(id);
        }}
        onOpenResult={({ message }) => {
          onSelect(message.conversationId);
          setFocus({ messageId: message.id, threadId: message.threadId, at: Date.now() });
        }}
        onNew={() => setNewOpen(true)}
      />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selected ? (
          <ConversationView key={selected.id} conversation={selected} focus={focus} />
        ) : isLoading ? (
          <Skeleton className="m-6 h-40 rounded-xl" />
        ) : (
          <p className="text-neutral-5 p-6">Pick a conversation, or start one with New.</p>
        )}
      </section>
      <NewChatDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(id) => {
          setNewOpen(false);
          onSelect(id);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// the list of conversations, and what a search finds

function ConversationRail({
  conversations,
  loading,
  error,
  selectedId,
  projectId,
  onSelect,
  onOpenResult,
  onNew,
}: {
  conversations: Conversation[] | undefined;
  loading: boolean;
  error?: string;
  selectedId: string;
  projectId: string;
  onSelect: (id: string) => void;
  onOpenResult: (result: SearchResult) => void;
  onNew: () => void;
}) {
  const [search, setSearch] = useState('');
  // the words searched for once typing pauses
  const [term, setTerm] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const searching = term.trim().length >= 2;

  const sections = useMemo(() => {
    const words = search.trim().toLowerCase();
    const all = (conversations ?? []).filter(
      (c) =>
        !words || c.title.toLowerCase().includes(words) || c.labTitle?.toLowerCase().includes(words)
    );
    const latest = (c: Conversation) => c.lastMessage?.createdAt ?? 0;
    // busy ones first, then by name
    const byActivity = (a: Conversation, b: Conversation) =>
      latest(b) - latest(a) || a.title.localeCompare(b.title);
    const here = all.filter((c) => c.id === projectConversationId(projectId));
    return [
      { title: 'This project', items: here },
      {
        title: 'Direct and groups',
        items: all.filter((c) => c.kind === 'direct' || c.kind === 'group').sort(byActivity),
        action: !words,
      },
      {
        title: 'Projects',
        items: all.filter((c) => c.kind === 'project' && !here.includes(c)).sort(byActivity),
      },
      { title: 'Labs', items: all.filter((c) => c.kind === 'lab').sort(byActivity) },
    ];
  }, [conversations, search, projectId]);

  return (
    <aside className="border-neutral-2 bg-neutral-1/40 flex w-64 shrink-0 flex-col gap-3 overflow-hidden border-r p-3">
      <div className="flex shrink-0 items-center gap-2">
        <label className="text-primary-9 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-white px-3 shadow-sm ring-1 ring-black/5">
          <SearchOutlined />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearch('');
            }}
            placeholder="Search chats and messages..."
            className="placeholder:text-neutral-3 w-full bg-transparent text-sm outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onNew}
          aria-label="New chat"
          title="New chat"
          className="bg-primary-9 hover:bg-primary-8 flex size-9 shrink-0 items-center justify-center rounded-full text-white"
        >
          <PlusOutlined />
        </button>
      </div>
      <nav className="secondary-scrollbar -mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pb-2">
        {loading && <Skeleton className="h-14 w-full rounded-2xl" />}
        {error && <p className="text-destructive px-2 text-sm">{error}</p>}
        {sections.map(
          (section) =>
            (section.items.length > 0 || section.action) && (
              <section key={section.title} className="flex flex-col gap-1">
                <h3 className="text-neutral-4 px-2 text-[11px] font-semibold tracking-wider uppercase">
                  {section.title}
                </h3>
                {section.items.length === 0 && (
                  <p className="text-neutral-4 px-2 text-sm">None yet: start one with +.</p>
                )}
                {section.items.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    active={c.id === selectedId}
                    onSelect={() => onSelect(c.id)}
                  />
                ))}
              </section>
            )
        )}
        {searching && (
          <SearchResults term={term} conversations={conversations ?? []} onOpen={onOpenResult} />
        )}
      </nav>
    </aside>
  );
}

const MARK_START = '\u0002';
const MARK_END = '\u0003';

/** A snippet cut at the marks the server puts around the search's words. */
function markedParts(text: string) {
  const parts: { text: string; marked: boolean }[] = [];
  let piece = '';
  let marked = false;
  for (const ch of text) {
    if (ch === MARK_START || ch === MARK_END) {
      if (piece) parts.push({ text: piece, marked });
      piece = '';
      marked = ch === MARK_START;
    } else {
      piece += ch;
    }
  }
  if (piece) parts.push({ text: piece, marked });
  return parts;
}

/** The search's words in a snippet, marked. */
function Snippet({ text }: { text: string }) {
  return (
    <>
      {markedParts(text).map((part, i) =>
        part.marked ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one fixed string
          <mark key={i} className="text-primary-9 rounded bg-amber-200 px-0.5">
            {part.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: the pieces of one fixed string
          <Fragment key={i}>{plain(part.text)}</Fragment>
        )
      )}
    </>
  );
}

function SearchResults({
  term,
  conversations,
  onOpen,
}: {
  term: string;
  conversations: Conversation[];
  onOpen: (result: SearchResult) => void;
}) {
  const { data, isFetching } = useSearch(term);
  const titles = new Map(conversations.map((c) => [c.id, c.title]));
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-neutral-4 px-2 text-[11px] font-semibold tracking-wider uppercase">
        Messages {isFetching && '…'}
      </h3>
      {data?.length === 0 && <p className="text-neutral-4 px-2 text-sm">No messages match.</p>}
      {data?.map((r) => (
        <button
          key={r.message.id}
          type="button"
          onClick={() => onOpen(r)}
          className="text-primary-9 flex w-full flex-col rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white"
        >
          <span className="text-neutral-4 flex gap-1 truncate text-[11px]">
            <span className="truncate font-semibold">
              {titles.get(r.message.conversationId) ?? 'Chat'}
            </span>
            {r.message.threadId && <span className="shrink-0">· in a thread</span>}
            <span className="ml-auto shrink-0">{when(r.message.createdAt)}</span>
          </span>
          <span className="line-clamp-2 text-xs">
            <span className="font-semibold">{r.message.sender.name.split(' ')[0]}: </span>
            <Snippet text={r.snippet} />
          </span>
        </button>
      ))}
    </section>
  );
}

function ConversationItem({
  conversation: c,
  active,
  onSelect,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
}) {
  const { me } = useChatStream();
  const last = c.lastMessage;
  const who = last && (last.sender.id === me?.id ? 'You' : last.sender.name.split(' ')[0]);
  const subtitle = last
    ? last.deleted
      ? `${who}: message deleted`
      : `${who}: ${plain(last.body)}`
    : c.kind === 'lab'
      ? 'Everyone in the lab'
      : c.kind === 'project'
        ? c.labTitle
          ? `Everyone in the project · ${c.labTitle}`
          : 'Everyone in the project'
        : 'No messages yet';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors',
        active ? 'bg-primary-9 text-white' : 'text-primary-9 hover:bg-white'
      )}
    >
      <span
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full text-sm',
          active ? 'bg-white/15' : 'bg-white shadow-sm ring-1 ring-black/5'
        )}
      >
        {KIND_ICON[c.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              c.unread ? 'font-bold' : 'font-semibold'
            )}
          >
            {c.title}
          </span>
          {last && (
            <span
              className={cn('shrink-0 text-[11px]', active ? 'text-white/70' : 'text-neutral-4')}
            >
              {when(last.createdAt)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-xs',
              active ? 'text-white/80' : c.unread ? 'text-primary-9' : 'text-neutral-4'
            )}
          >
            {subtitle}
          </span>
          {c.mentions > 0 && (
            <span className="flex h-5 shrink-0 items-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-amber-950">
              @
            </span>
          )}
          {c.unread > 0 && (
            <span
              className={cn(
                'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
                active ? 'text-primary-9 bg-white' : 'bg-primary-9 text-white'
              )}
            >
              {c.unread > 99 ? '99+' : c.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// one conversation, and a thread in it

/** Within this long of the one before, a message from the same person joins it. */
const RUN_MS = 5 * 60_000;
/** This close to the foot of the list counts as reading the newest messages. */
const NEAR_BOTTOM_PX = 120;
/** How long a message a search found stays lit once brought into view. */
const FLASH_MS = 2000;

/**
 * A list of messages that keeps its foot in view while you read there, says so when something
 * new arrives below, and can bring one message into view and light it up.
 */
function useMessageScroll(count: number, onBottom: () => void) {
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const [showJump, setShowJump] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new message is the trigger
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (atBottom.current) el.scrollTop = el.scrollHeight;
    else setShowJump(true);
  }, [count]);

  return {
    scroller,
    atBottom,
    showJump,
    onScroll: () => {
      const el = scroller.current;
      if (!el) return;
      atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      if (atBottom.current) {
        setShowJump(false);
        onBottom();
      }
    },
    toBottom: () => {
      const el = scroller.current;
      atBottom.current = true;
      if (el) el.scrollTop = el.scrollHeight;
      setShowJump(false);
    },
  };
}

function ConversationView({
  conversation: c,
  focus,
}: {
  conversation: Conversation;
  focus: Focus | null;
}) {
  const { me, typing } = useChatStream();
  const { data: page, isLoading } = useMessages(c.id);
  const { data: members } = useMembers(c.id);
  const send = useSendMessage(c.id, me);
  const loadOlder = useLoadOlder(c.id);
  const markRead = useMarkRead();
  const [threadRoot, setThreadRoot] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  // where the new messages began when the conversation was opened
  const [unreadFrom] = useState(() => c.unread);

  const messages = page?.messages ?? [];
  const lastId = messages.filter((m) => !m.pending).at(-1)?.id;
  const firstUnread =
    unreadFrom > 0 ? messages[Math.max(0, messages.length - unreadFrom)]?.id : undefined;
  const people = (members ?? c.members ?? []).filter((m) => m.id !== me?.id);
  const typingHere = (typing[c.id] ?? []).filter((t) => t.user.id !== me?.id);
  const readNewest = () => {
    if (lastId && c.unread > 0) markRead(c.id, lastId).catch(() => undefined);
  };
  const list = useMessageScroll(messages.length, readNewest);

  // read once the newest is in view, in a tab that is being looked at
  useEffect(() => {
    if (!lastId) return;
    const read = () => {
      if (document.visibilityState === 'visible' && list.atBottom.current && c.unread > 0) {
        markRead(c.id, lastId).catch(() => undefined);
      }
    };
    read();
    document.addEventListener('visibilitychange', read);
    return () => document.removeEventListener('visibilitychange', read);
  }, [lastId, c.id, c.unread, markRead, list.atBottom]);

  // a message a search found: its thread opened, or older pages loaded until it is there
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new search pick is the trigger
  useEffect(() => {
    if (!focus || focus.messageId === undefined) return;
    if (focus.threadId) {
      setThreadRoot(focus.threadId);
      return;
    }
    let cancelled = false;
    (async () => {
      for (let tries = 0; tries < 10 && !cancelled; tries += 1) {
        const el = list.scroller.current?.querySelector(`[data-message-id="${focus.messageId}"]`);
        if (el) {
          list.atBottom.current = false;
          el.scrollIntoView({ block: 'center' });
          setFlashId(focus.messageId);
          setTimeout(() => setFlashId(null), FLASH_MS);
          return;
        }
        await loadOlder();
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focus?.at, isLoading]);

  const older = async () => {
    const el = list.scroller.current;
    const from = el ? el.scrollHeight - el.scrollTop : 0;
    await loadOlder();
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - from;
    });
  };

  if (threadRoot) {
    return (
      <ThreadView
        conversation={c}
        rootId={threadRoot}
        people={people}
        focusId={focus?.threadId === threadRoot ? focus.messageId : null}
        onBack={() => setThreadRoot(null)}
      />
    );
  }

  const description =
    c.kind === 'lab'
      ? 'Everyone in this lab'
      : c.kind === 'project'
        ? `Everyone in this project${c.labTitle ? ` · ${c.labTitle}` : ''}`
        : c.kind === 'direct'
          ? 'Direct message'
          : 'Group';

  return (
    <>
      <header className="border-neutral-2 flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
        <span className="bg-neutral-1 text-primary-9 flex size-8 items-center justify-center rounded-full">
          {KIND_ICON[c.kind]}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-primary-9 truncate text-base font-bold">{c.title}</h2>
          <Popover
            trigger="click"
            placement="bottomLeft"
            content={
              <ul className="max-h-72 w-64 overflow-y-auto">
                {(members ?? c.members ?? []).map((m) => (
                  <li key={m.id} className="text-primary-9 flex items-center gap-2 py-1 text-sm">
                    <Avatar user={m} size={24} /> {m.name}
                    {m.id === me?.id && <span className="text-neutral-4">(you)</span>}
                  </li>
                ))}
              </ul>
            }
          >
            <button type="button" className="text-neutral-4 hover:text-primary-9 text-xs">
              {description}
              {members ? ` · ${members.length} ${members.length === 1 ? 'person' : 'people'}` : ''}
            </button>
          </Popover>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={list.scroller}
          onScroll={list.onScroll}
          className="secondary-scrollbar absolute inset-0 overflow-y-auto px-4 py-3"
        >
          {page?.more && (
            <div className="mb-3 flex justify-center">
              <button
                type="button"
                onClick={older}
                className="text-primary-7 hover:bg-neutral-1 rounded-full px-3 py-1 text-xs font-semibold"
              >
                Earlier messages
              </button>
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-24 w-2/3 rounded-xl" />
          ) : messages.length === 0 ? (
            <p className="text-neutral-4 pt-10 text-center text-sm">
              No messages yet. Say hello to{' '}
              {c.kind === 'direct' ? c.title : `everyone in ${c.title}`}.
            </p>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay =
                !prev ||
                new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              // a message with a thread under it ends a run, so the next starts its own
              const joined =
                !newDay &&
                prev?.sender.id === m.sender.id &&
                !prev.replyCount &&
                m.createdAt - prev.createdAt < RUN_MS;
              return (
                <div key={m.clientId ?? m.id}>
                  {newDay && <DayLine at={m.createdAt} />}
                  {m.id === firstUnread && (
                    <div className="my-2 flex items-center gap-3 text-[11px] font-semibold text-amber-600">
                      <span className="h-px flex-1 bg-amber-300" />
                      New
                      <span className="h-px flex-1 bg-amber-300" />
                    </div>
                  )}
                  <MessageRow
                    message={m}
                    joined={joined}
                    conversation={c}
                    flash={m.id === flashId}
                    onReply={() => setThreadRoot(m.id)}
                  />
                </div>
              );
            })
          )}
        </div>
        {list.showJump && <JumpButton onClick={list.toBottom} />}
      </div>

      <footer className="shrink-0 px-4 pt-0.5 pb-3">
        <TypingLine users={typingHere.map((t) => t.user)} />
        <Composer
          conversationId={c.id}
          people={people}
          placeholder={`Message ${c.title}`}
          onSend={(body) => {
            list.atBottom.current = true;
            send(body);
          }}
        />
      </footer>
    </>
  );
}

function ThreadView({
  conversation: c,
  rootId,
  people,
  focusId,
  onBack,
}: {
  conversation: Conversation;
  rootId: string;
  people: ChatUser[];
  focusId: string | null;
  onBack: () => void;
}) {
  const { me } = useChatStream();
  const { data: thread, isLoading } = useThread(c.id, rootId);
  const send = useSendMessage(c.id, me, rootId);
  const markRead = useMarkRead();
  const [flashId, setFlashId] = useState<string | null>(null);
  const replies = thread?.replies ?? [];
  const list = useMessageScroll(replies.length, () => undefined);

  // a reply that mentions you counts as unread until its thread is open
  const newest = replies.filter((m) => !m.pending).at(-1)?.id;
  useEffect(() => {
    if (newest && c.mentions > 0) markRead(c.id, newest).catch(() => undefined);
  }, [newest, c.id, c.mentions, markRead]);

  // a reply a search found
  useEffect(() => {
    if (!focusId || isLoading) return;
    const el = list.scroller.current?.querySelector(`[data-message-id="${focusId}"]`);
    if (!el) return;
    list.atBottom.current = false;
    el.scrollIntoView({ block: 'center' });
    setFlashId(focusId);
    const timer = setTimeout(() => setFlashId(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [focusId, isLoading, list.scroller, list.atBottom]);

  return (
    <>
      <header className="border-neutral-2 flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label={`Back to ${c.title}`}
          title={`Back to ${c.title}`}
          className="text-primary-9 hover:bg-neutral-1 flex size-8 items-center justify-center rounded-full"
        >
          <ArrowLeftOutlined />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-primary-9 text-base font-bold">Thread</h2>
          <p className="text-neutral-4 truncate text-xs">in {c.title}</p>
        </div>
      </header>
      <div className="relative min-h-0 flex-1">
        <div
          ref={list.scroller}
          onScroll={list.onScroll}
          className="secondary-scrollbar absolute inset-0 overflow-y-auto px-4 py-3"
        >
          {isLoading || !thread ? (
            <Skeleton className="h-24 w-2/3 rounded-xl" />
          ) : (
            <>
              <MessageRow message={thread.root} joined={false} conversation={c} inThread />
              <div className="text-neutral-4 my-3 flex items-center gap-3 text-[11px] font-semibold">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                <span className="bg-neutral-2 h-px flex-1" />
              </div>
              {replies.map((m, i) => {
                const prev = replies[i - 1];
                const joined =
                  !!prev && prev.sender.id === m.sender.id && m.createdAt - prev.createdAt < RUN_MS;
                return (
                  <MessageRow
                    key={m.clientId ?? m.id}
                    message={m}
                    joined={joined}
                    conversation={c}
                    flash={m.id === flashId}
                    inThread
                  />
                );
              })}
            </>
          )}
        </div>
        {list.showJump && <JumpButton onClick={list.toBottom} />}
      </div>
      <footer className="shrink-0 px-4 pt-0.5 pb-3">
        <TypingLine users={[]} />
        <Composer
          conversationId={c.id}
          draftKey={`${c.id}#${rootId}`}
          people={people}
          placeholder="Reply in thread"
          onSend={(body) => {
            list.atBottom.current = true;
            send(body);
          }}
        />
      </footer>
    </>
  );
}

function DayLine({ at }: { at: number }) {
  return (
    <div className="text-neutral-4 my-4 flex items-center gap-3 text-[11px] font-semibold tracking-wide uppercase">
      <span className="bg-neutral-2 h-px flex-1" />
      {day(at)}
      <span className="bg-neutral-2 h-px flex-1" />
    </div>
  );
}

function JumpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-primary-9 absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-lg"
    >
      New messages ↓
    </button>
  );
}

function TypingLine({ users }: { users: ChatUser[] }) {
  return (
    <p className="text-neutral-4 h-5 text-xs">
      {users.length > 0 &&
        `${users.map((u) => u.name.split(' ')[0]).join(', ')} ${users.length === 1 ? 'is' : 'are'} typing…`}
    </p>
  );
}

// ---------------------------------------------------------------------------------------------
// one message: its reactions, its thread, and what can be done to it

function MessageRow({
  message: m,
  joined,
  conversation: c,
  flash = false,
  inThread = false,
  onReply,
}: {
  message: ChatMessage;
  joined: boolean;
  conversation: Conversation;
  flash?: boolean;
  /** In a thread there is no thread to open. */
  inThread?: boolean;
  onReply?: () => void;
}) {
  const { me } = useChatStream();
  const actions = useMessageActions(c.id);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const mine = !!me && m.sender.id === me.id;
  const mentionsMe = !!me && m.mentions.includes(me.id);
  const settled = !m.pending && !m.failed && !m.deleted;
  const canDelete = settled && (mine || c.canModerate);

  return (
    <div
      data-message-id={m.id}
      className={cn(
        'group/msg relative -mx-2 flex gap-3 rounded-lg px-2 transition-colors duration-700',
        joined ? 'pt-0.5' : 'pt-3',
        mentionsMe && 'bg-amber-50',
        flash && 'bg-amber-100',
        m.pending && 'opacity-60'
      )}
    >
      <div className="w-8 shrink-0">{!joined && <Avatar user={m.sender} />}</div>
      <div className="min-w-0 flex-1 pb-0.5">
        {!joined && (
          <div className="flex items-baseline gap-2">
            <span className="text-primary-9 text-sm font-semibold">{m.sender.name}</span>
            <span className="text-neutral-4 text-[11px]">{clock(m.createdAt)}</span>
          </div>
        )}
        {m.deleted ? (
          <p className="text-neutral-4 text-sm italic">This message was deleted.</p>
        ) : editing ? (
          <EditBox
            body={m.body}
            onCancel={() => setEditing(false)}
            onSave={async (body) => {
              await actions.edit(m.id, body);
              setEditing(false);
            }}
          />
        ) : (
          <div className="flex items-end gap-1.5">
            <div className="min-w-0">
              <MessageBody body={m.body} meId={me?.id} />
            </div>
            {m.editedAt && (
              <span
                className="text-neutral-4 shrink-0 pb-1 text-[11px]"
                title={`Edited ${new Date(m.editedAt).toLocaleString()}`}
              >
                (edited)
              </span>
            )}
          </div>
        )}
        {m.failed && (
          <p className="text-destructive text-xs">Not sent: {m.error ?? 'check the connection'}.</p>
        )}

        {!m.deleted && m.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {m.reactions.map((r) => {
              const reacted = !!me && r.users.some((u) => u.id === me.id);
              return (
                <button
                  key={r.emoji}
                  type="button"
                  title={r.users.map((u) => u.name).join(', ')}
                  onClick={() => actions.react(m.id, r.emoji).catch(() => undefined)}
                  className={cn(
                    'flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors',
                    reacted
                      ? 'border-primary-4 bg-primary-1 text-primary-9'
                      : 'border-neutral-2 text-neutral-6 bg-white hover:border-neutral-3'
                  )}
                >
                  <span>{r.emoji}</span>
                  <span className="font-semibold">{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}

        {!inThread && !!m.replyCount && (
          <button
            type="button"
            onClick={onReply}
            className="text-primary-7 hover:bg-primary-1/60 -ml-1 mt-1 flex items-center gap-1.5 rounded-md px-1 py-0.5 text-xs font-semibold"
          >
            <CommentOutlined />
            {m.replyCount} {m.replyCount === 1 ? 'reply' : 'replies'}
            {m.lastReplyAt && (
              <span className="text-neutral-4 font-normal">· last {when(m.lastReplyAt)}</span>
            )}
          </button>
        )}
      </div>

      {settled && !editing && (
        <div
          className={cn(
            'border-neutral-2 absolute -top-3 right-2 z-10 flex items-center gap-0.5 rounded-lg border bg-white p-0.5 shadow-sm',
            pickerOpen ? 'flex' : 'hidden group-hover/msg:flex'
          )}
        >
          <Popover
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            trigger="click"
            placement="topRight"
            content={
              <div className="flex gap-1">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setPickerOpen(false);
                      actions.react(m.id, emoji).catch(() => undefined);
                    }}
                    className="hover:bg-neutral-1 flex size-8 items-center justify-center rounded-md text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            }
          >
            <ToolButton label="React">
              <SmileOutlined />
            </ToolButton>
          </Popover>
          {!inThread && onReply && (
            <ToolButton label="Reply in thread" onClick={onReply}>
              <CommentOutlined />
            </ToolButton>
          )}
          {mine && (
            <ToolButton label="Edit" onClick={() => setEditing(true)}>
              <EditOutlined />
            </ToolButton>
          )}
          {canDelete && (
            <Popconfirm
              title="Delete this message?"
              description={
                mine ? 'Everyone will see it was deleted.' : 'You are deleting it as an admin.'
              }
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => actions.remove(m.id).catch(() => undefined)}
            >
              <ToolButton label="Delete" danger>
                <DeleteOutlined />
              </ToolButton>
            </Popconfirm>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * A small icon button of a message's toolbar. It passes on what it is given (a ref, handlers),
 * since antd's popovers attach themselves to it that way.
 */
function ToolButton({
  label,
  danger = false,
  children,
  ...rest
}: {
  label: string;
  danger?: boolean;
  children: ReactNode;
} & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        'flex size-7 items-center justify-center rounded-md text-sm transition-colors',
        danger
          ? 'text-neutral-5 hover:bg-red-50 hover:text-red-600'
          : 'text-neutral-5 hover:bg-neutral-1 hover:text-primary-9'
      )}
    >
      {children}
    </button>
  );
}

/** A message being edited in place: Enter saves, Escape leaves it as it was. */
function EditBox({
  body,
  onSave,
  onCancel,
}: {
  body: string;
  onSave: (body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [{ text: initial, picked }] = useState(() => withoutMentionLinks(body));
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the text is what changes the height
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [text]);
  useEffect(() => {
    const el = area.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const save = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSave(withMentionLinks(trimmed, picked));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-1 flex flex-col gap-1">
      <textarea
        ref={area}
        value={text}
        aria-label="Edit message"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          }
        }}
        className="border-primary-4 text-primary-9 w-full resize-none rounded-xl border bg-white px-3 py-2 text-[15px] leading-6 outline-none"
      />
      <div className="text-neutral-4 flex items-center gap-2 text-[11px]">
        Enter to save · Esc to cancel
        <button
          type="button"
          onClick={onCancel}
          className="hover:bg-neutral-1 ml-auto rounded-full px-3 py-1 font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || !text.trim()}
          className="bg-primary-9 rounded-full px-3 py-1 font-semibold text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
