'use client';

import { CloseOutlined, MessageOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { CHAT_URL } from './api';
import { ChatPanel } from './chat-panel';
import { useUnreadTotals } from './hooks';

/** Which edge of the screen the button sits on, and where along it (0 to 1). */
type Dock = { edge: 'left' | 'right' | 'top' | 'bottom'; at: number };

const SIZE = 52;
const MARGIN = 12;
const GAP = 12;
/** A press that moves less than this is a click, not a drag. */
const DRAG_PX = 5;
const DOCK_KEY = 'obi-chat-dock';
const DEFAULT_DOCK: Dock = { edge: 'right', at: 0.62 };

function readDock(): Dock {
  try {
    const saved = JSON.parse(localStorage.getItem(DOCK_KEY) ?? 'null');
    if (saved && ['left', 'right', 'top', 'bottom'].includes(saved.edge)) return saved;
  } catch {
    // no storage: the default place
  }
  return DEFAULT_DOCK;
}

function saveDock(dock: Dock) {
  try {
    localStorage.setItem(DOCK_KEY, JSON.stringify(dock));
  } catch {
    // remembered for this page only
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The button's top-left corner for a dock, in a viewport of this size. */
function place({ edge, at }: Dock, w: number, h: number) {
  const along = (length: number) => clamp(at * length - SIZE / 2, MARGIN, length - SIZE - MARGIN);
  if (edge === 'left') return { left: MARGIN, top: along(h) };
  if (edge === 'right') return { left: w - SIZE - MARGIN, top: along(h) };
  if (edge === 'top') return { left: along(w), top: MARGIN };
  return { left: along(w), top: h - SIZE - MARGIN };
}

/** The edge nearest a point, and how far along it the point is. */
function snap(x: number, y: number, w: number, h: number): Dock {
  const distances = { left: x, right: w - x, top: y, bottom: h - y };
  const edge = (Object.keys(distances) as Dock['edge'][]).reduce((a, b) =>
    distances[a] <= distances[b] ? a : b
  );
  return { edge, at: edge === 'left' || edge === 'right' ? y / h : x / w };
}

/** The window beside the button, on the side away from its edge, kept on screen. */
function windowBox(dock: Dock, button: { left: number; top: number }, w: number, h: number) {
  const width = Math.min(760, w - 2 * MARGIN);
  const height = Math.min(600, h - 2 * MARGIN);
  const across = (start: number, size: number, length: number) =>
    clamp(start + SIZE / 2 - size / 2, MARGIN, length - size - MARGIN);
  let left: number;
  let top: number;
  if (dock.edge === 'right' || dock.edge === 'left') {
    left = dock.edge === 'right' ? button.left - GAP - width : button.left + SIZE + GAP;
    top = across(button.top, height, h);
  } else {
    top = dock.edge === 'bottom' ? button.top - GAP - height : button.top + SIZE + GAP;
    left = across(button.left, width, w);
  }
  return {
    left: clamp(left, MARGIN, w - width - MARGIN),
    top: clamp(top, MARGIN, h - height - MARGIN),
    width,
    height,
  };
}

function useViewport() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const read = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return size;
}

/**
 * The chat, from anywhere in a project: a message button on the edge of the screen with the count
 * of unread messages. Drag it and it moves to the nearest edge; click it and the chat opens in a
 * window beside it, which stays open while you work until it is closed.
 */
export function ChatLauncher() {
  const { w, h } = useViewport();
  const [dock, setDock] = useState<Dock>(DEFAULT_DOCK);
  const [dragAt, setDragAt] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const { unread, mentions } = useUnreadTotals();

  // the place it was left in, once in the browser
  useEffect(() => setDock(readDock()), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!CHAT_URL || !w) return null;

  const docked = place(dock, w, h);
  const button = dragAt
    ? {
        left: clamp(dragAt.x - SIZE / 2, MARGIN, w - SIZE - MARGIN),
        top: clamp(dragAt.y - SIZE / 2, MARGIN, h - SIZE - MARGIN),
      }
    : docked;
  const box = windowBox(dock, docked, w, h);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-window"
            role="dialog"
            aria-label="Chat"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="fixed z-[900] flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_60px_-12px_rgb(0_39_102/0.35),0_0_0_1px_rgb(0_39_102/0.06)]"
            // kept, hidden, while the button is dragged, so nothing in it (a half-written message)
            // is lost; it moves beside the button where it lands
            style={{
              ...box,
              transformOrigin: originOf(dock),
              visibility: dragAt ? 'hidden' : undefined,
            }}
          >
            <div className="border-neutral-2 flex h-11 shrink-0 items-center gap-2 border-b pr-2 pl-4">
              <MessageOutlined className="text-primary-9" />
              <span className="text-primary-9 text-sm font-semibold">Chat</span>
              <button
                type="button"
                aria-label="Close chat"
                title="Close (Esc)"
                onClick={() => setOpen(false)}
                className="text-neutral-4 hover:bg-neutral-1 hover:text-primary-9 ml-auto flex size-8 items-center justify-center rounded-full"
              >
                <CloseOutlined />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ChatPanel selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label={open ? 'Close chat' : unread ? `Chat, ${unread} unread` : 'Chat'}
        aria-expanded={open}
        title={dragAt ? undefined : 'Chat (drag to move)'}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          press.current = { x: e.clientX, y: e.clientY, moved: false };
        }}
        onPointerMove={(e) => {
          const p = press.current;
          if (!p) return;
          if (!p.moved && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_PX) return;
          p.moved = true;
          setDragAt({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={(e) => {
          const p = press.current;
          press.current = null;
          if (p?.moved) {
            const next = snap(e.clientX, e.clientY, w, h);
            setDock(next);
            saveDock(next);
            setDragAt(null);
          } else if (p) {
            setOpen((o) => !o);
          }
        }}
        onPointerCancel={() => {
          press.current = null;
          setDragAt(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className={cn(
          'bg-primary-9 fixed z-[901] flex touch-none items-center justify-center rounded-full text-white shadow-[0_10px_24px_-6px_rgb(0_39_102/0.55)] select-none',
          dragAt ? 'cursor-grabbing' : 'cursor-pointer transition-[left,top] duration-300 ease-out',
          open && 'ring-primary-3 ring-4'
        )}
        style={{ ...button, width: SIZE, height: SIZE }}
      >
        {open ? <CloseOutlined className="text-lg" /> : <MessageOutlined className="text-xl" />}
        {unread > 0 && !open && (
          <span
            className={cn(
              'absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ring-2 ring-white',
              mentions > 0 ? 'bg-amber-400 text-amber-950' : 'bg-red-500 text-white'
            )}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </>
  );
}

/** The window grows out of the side the button is on. */
function originOf({ edge }: Dock) {
  return { left: 'left center', right: 'right center', top: 'center top', bottom: 'center bottom' }[
    edge
  ];
}
