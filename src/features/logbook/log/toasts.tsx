import { isNil } from 'es-toolkit';
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { SettingsButton } from '@/features/logbook/board/rail';
import { worksFor } from '@/features/logbook/collaboration/actors';
import { AGENT_TOAST_MS } from '@/features/logbook/constants';
import { useNow } from '@/features/logbook/helpers';
import { NoticeKind, PopoverAlign, PopoverSide, ToastSource } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type {
  IAgentToastProps,
  IChange,
  IKindLook,
  INotice,
  TNoticeKind,
} from '@/features/logbook/types';

const looks: Readonly<Record<TNoticeKind, IKindLook>> = {
  [NoticeKind.Success]: {
    icon: 'check',
    badge: 'bg-green-main/10 text-green-main',
    bar: 'bg-green-main',
    card: '',
    lifeMs: 4500,
  },
  [NoticeKind.Info]: {
    icon: 'info',
    badge: 'bg-primary-6/10 text-primary-6',
    bar: 'bg-primary-6',
    card: '',
    lifeMs: 6000,
  },
  [NoticeKind.Warning]: {
    icon: 'warning',
    badge: 'bg-warning/12 text-warning',
    bar: 'bg-warning',
    card: '',
    lifeMs: 9000,
  },
  [NoticeKind.Error]: {
    icon: 'error',
    badge: 'bg-destructive/10 text-destructive animate-shake',
    bar: '',
    card: 'ring-1 ring-destructive/25',
    lifeMs: null,
  },
};

const CARD =
  'pointer-events-auto relative flex w-full animate-up items-start gap-3 overflow-hidden rounded-[14px] bg-white p-3 pr-2 shadow-pop';
const TITLE = 'text-[14px] leading-5 font-semibold text-primary-9';
const TEXT =
  'mt-0.5 line-clamp-4 text-[13px] leading-[18px] text-neutral-4 select-text [overflow-wrap:anywhere]';
const ICON_BUTTON = 'icon-btn size-7 rounded-lg';

export function ToastStack({
  narrow,
  children,
}: {
  readonly narrow: boolean;
  readonly children: ReactNode;
}) {
  return (
    <section
      aria-label="Notifications"
      className="pointer-events-none absolute right-4 bottom-4 z-30 flex w-[min(384px,calc(100%-32px))] flex-col gap-2 data-[narrow=true]:right-2 data-[narrow=true]:bottom-3 data-[narrow=true]:w-[min(384px,calc(100%-16px))]"
      data-narrow={narrow}
    >
      {children}
    </section>
  );
}

function useCountdown(ms: number | null, paused: boolean, onEnd: () => void) {
  const left = useRef(ms ?? 0);
  const end = useEffectEvent(onEnd);
  useEffect(() => {
    if (isNil(ms) || paused) return;
    const started = Date.now();
    const timer = setTimeout(end, left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started;
    };
  }, [ms, paused]);
}

function TimeBar({ ms, className, paused }: { ms: number; className: string; paused: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'absolute inset-x-0 bottom-0 h-0.5 origin-left animate-drain opacity-60',
        className
      )}
      style={{ animationDuration: `${ms}ms`, animationPlayState: paused ? 'paused' : 'running' }}
    />
  );
}

export function NoticeToast({
  notice,
  onClose,
}: {
  readonly notice: INotice;
  readonly onClose: () => void;
}) {
  const look = looks[notice.kind];
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  useCountdown(look.lifeMs, paused, onClose);
  return (
    <div
      className={cn(CARD, look.card)}
      role={notice.kind === NoticeKind.Error ? 'alert' : 'status'}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <span className={cn('grid size-8 flex-none place-items-center rounded-[10px]', look.badge)}>
        <Icon name={look.icon} size={16} stroke={2.2} />
      </span>
      <div className="min-w-0 flex-1 pt-1.5">
        <p className={TITLE}>{notice.title}</p>
        {isNil(notice.description) ? null : <p className={TEXT}>{notice.description}</p>}
      </div>
      <button
        type="button"
        className={ICON_BUTTON}
        aria-label="Dismiss notification"
        title="Dismiss"
        onClick={onClose}
      >
        <Icon name="close" size={12} stroke={2.4} />
      </button>
      {isNil(look.lifeMs) ? null : (
        <TimeBar ms={look.lifeMs} className={look.bar} paused={paused} />
      )}
    </div>
  );
}

export function AgentToast(props: IAgentToastProps) {
  const { feed } = props;
  const toast = useSyncExternalStore(feed.subscribe, () => feed.snapshot().toast);
  const [goneAt, setGoneAt] = useState<number | null>(null);
  if (isNil(toast) || toast.at === goneAt) return null;
  return <AgentToastCard {...props} toast={toast} onGone={() => setGoneAt(toast.at)} />;
}

function AgentToastCard({
  feed,
  settings,
  me,
  onShow,
  toast,
  onGone,
}: IAgentToastProps & { readonly toast: IChange; readonly onGone: () => void }) {
  const now = useNow();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const gone = useEffectEvent(onGone);
  useEffect(() => {
    if (settingsOpen) return;
    const timer = setTimeout(gone, Math.max(0, toast.at + AGENT_TOAST_MS - Date.now()));
    return () => clearTimeout(timer);
  }, [toast.at, settingsOpen]);
  if (!settingsOpen) {
    if (!settings.toasts) return null;
    if (settings.from === ToastSource.Mine && !worksFor(toast.actor, me.userId)) return null;
  }
  const ago = now - toast.at < 5000 ? 'just now' : `${Math.round((now - toast.at) / 1000)}s ago`;
  return (
    <div ref={card} className={CARD} role="status">
      <span
        className="grid size-8 flex-none place-items-center rounded-[10px] text-white"
        style={{ background: toast.actor.colour }}
      >
        <Icon name="sparkle" size={16} stroke={2.2} />
      </span>
      <div className="min-w-0 flex-1 pt-1.5">
        <p className={cn(TITLE, 'flex items-baseline gap-1.5')}>
          <span className="truncate">{toast.actor.name}</span>
          <span className="flex-none text-[12px] font-normal text-neutral-4">{ago}</span>
        </p>
        <p className={TEXT}>{toast.summary}</p>
        <button
          type="button"
          className="mt-1.5 -ml-2.5 h-7 rounded-lg border-0 px-2.5 text-[12px] font-bold transition-colors hover:bg-fill-2"
          style={{ color: toast.actor.colour, backgroundColor: 'transparent' }}
          onClick={() => onShow(toast)}
        >
          Show in page
        </button>
      </div>
      <div className="flex flex-none items-center">
        <SettingsButton
          align={PopoverAlign.End}
          side={PopoverSide.Above}
          className={ICON_BUTTON}
          iconSize={14}
          anchor={card}
          onOpenChange={setSettingsOpen}
        />
        <button
          type="button"
          className={ICON_BUTTON}
          aria-label="Dismiss notification"
          title="Dismiss"
          onClick={() => feed.dismissToast()}
        >
          <Icon name="close" size={12} stroke={2.4} />
        </button>
      </div>
      {settingsOpen ? null : (
        <span
          key={toast.at}
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left animate-drain opacity-60"
          style={{
            animationDuration: `${AGENT_TOAST_MS}ms`,
            animationDelay: `-${now - toast.at}ms`,
            background: toast.actor.colour,
          }}
        />
      )}
    </div>
  );
}
