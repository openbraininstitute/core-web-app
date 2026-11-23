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
import { PopoverAlign, PopoverSide, ToastSource } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type { IAgentToastProps, IChange } from '@/features/logbook/types';

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
