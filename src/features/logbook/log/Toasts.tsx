// The agent toast and the notice.
import { isNil } from 'es-toolkit';
import { useRef, useState, useSyncExternalStore } from 'react';

import { SettingsButton } from '@/features/logbook/app/Rail';
import { cn } from '@/features/logbook/lib/utils';
import { ToastSource } from '@/features/logbook/log/notify-settings';
import { Icon } from '@/features/logbook/ui/icons';
import { PopoverAlign, PopoverSide } from '@/features/logbook/ui/popover';
import { useNow } from '@/features/logbook/ui/useNow';

import type { IMe } from '@/features/logbook/auth/session';
import type { ChangeFeed, IChange } from '@/features/logbook/collaboration/changes';
import type { INotifySettings } from '@/features/logbook/log/notify-settings';

const TOAST_MS = 7000;

// Both float centred above the bottom edge; a narrow screen only shrinks them.
// - The agent toast has one width (TOAST_WIDTH), so it does not jump as each change replaces the
//   last; inside it only the summary is cut: who, when and the buttons always show.
// - The notice is as wide as its words.
// The keyframes move `transform`, so the centring is a transform too, not Tailwind's `translate`.
const FLOATING =
  'absolute bottom-5 left-1/2 flex max-w-[min(640px,calc(100%-32px))] animate-pop items-center rounded-full text-[14px] text-white [transform:translateX(-50%)] data-[narrow=true]:bottom-3 data-[narrow=true]:max-w-[min(640px,calc(100%-16px))]';
const TOAST_WIDTH = 'w-[560px]';

export interface IAgentToastProps {
  readonly feed: ChangeFeed;
  readonly settings: INotifySettings;
  readonly me: IMe;
  readonly narrow: boolean;
  readonly onShow: (change: IChange) => void;
}

export function AgentToast({ feed, settings, me, narrow, onShow }: IAgentToastProps) {
  const toast = useSyncExternalStore(feed.subscribe, () => feed.snapshot().toast);
  const now = useNow();
  // Its settings open from its bell, anchored to it: while they are open the toast stays, even
  // past its time or when they turn its messages off, so the panel never loses its anchor.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  if (isNil(toast)) return null;
  if (!settingsOpen) {
    if (!settings.toasts || now - toast.at > TOAST_MS) return null;
    // "Only my agents": an agent signed in as this person (its user id is theirs).
    if (settings.from === ToastSource.Mine && toast.actor.key !== me.userId) return null;
  }
  const ago = now - toast.at < 5000 ? 'just now' : `${Math.round((now - toast.at) / 1000)}s ago`;
  return (
    <div
      ref={bar}
      className={cn(FLOATING, TOAST_WIDTH, 'z-30 gap-2.5 p-[6px_6px_6px_14px] shadow-toast')}
      data-narrow={narrow}
      role="status"
      style={{ background: toast.actor.colour }}
    >
      <Icon name="sparkle" size={16} stroke={2.2} />
      <span
        className="flex min-w-0 flex-1 items-baseline gap-1"
        title={`${toast.actor.name} ${toast.summary}`}
      >
        <strong className="max-w-[45%] flex-none truncate">{toast.actor.name}</strong>
        <strong className="min-w-0 truncate">{toast.summary}</strong>
        <span className="flex-none" style={{ opacity: 0.85 }}>
          · {ago}
        </span>
      </span>
      <button
        type="button"
        className="h-7 flex-none rounded-full border-0 bg-white px-3 text-[12px] font-bold"
        style={{ color: toast.actor.colour }}
        onClick={() => onShow(toast)}
      >
        Show
      </button>
      <SettingsButton
        align={PopoverAlign.Center}
        side={PopoverSide.Above}
        className="grid size-7 flex-none place-items-center rounded-full border-0 bg-white/18 text-white aria-expanded:bg-white/30"
        iconSize={14}
        anchor={bar}
        onOpenChange={setSettingsOpen}
      />
      <button
        type="button"
        className="grid size-7 flex-none place-items-center rounded-full border-0 bg-white/18 text-white"
        aria-label="Dismiss"
        title="Dismiss"
        onClick={() => feed.dismissToast()}
      >
        <Icon name="close" size={12} stroke={2.4} />
      </button>
    </div>
  );
}

export function Notice({ text, narrow }: { readonly text: string; readonly narrow: boolean }) {
  return (
    <div
      className={cn(FLOATING, 'z-31 w-max gap-2 bg-primary-9 p-[10px_16px] font-semibold')}
      data-narrow={narrow}
      role="status"
    >
      <Icon name="check" size={14} stroke={2.6} />
      {text}
    </div>
  );
}
