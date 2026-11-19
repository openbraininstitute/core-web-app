// Presence: the avatars (the same animated group as the log cards) or the
// count chip, and the "Here now" roster with a jump to each cursor known from awareness.
import { relativePositionToAbsolutePosition, ySyncPluginKey } from '@tiptap/y-tiptap';
import { isNil, isNotNil } from 'es-toolkit';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import * as Y from 'yjs';

import { AvatarGroup } from '@/features/logbook/elements/motion/avatar-group';
import {
  presentList,
  stackOrder,
  statusLooks,
  summaryOf,
  whoLabelOf,
} from '@/features/logbook/log/presence-state';
import { Menu } from '@/features/logbook/log/ui-state';
import { Avatar } from '@/features/logbook/ui/Avatar';
import { Icon } from '@/features/logbook/ui/icons';
import { useNow } from '@/features/logbook/ui/useNow';

import type { Editor } from '@tiptap/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { IPopAt } from '@/features/logbook/log/EditorCard';
import type { ILogShared } from '@/features/logbook/log/LogPage';
import type { IPresent } from '@/features/logbook/log/presence-state';

// Two faces, then +N: the +N opens "Here now" with everyone.
const STACK = 2;

export function usePresent(props: ILogShared): IPresent[] {
  const now = useNow();
  const live = useSyncExternalStore(props.notices.subscribe, props.notices.snapshot);
  const changes = useSyncExternalStore(props.feed.subscribe, props.feed.snapshot);
  const { notices } = props;
  // Agents whose notice ran out leave the list, once per tick (never during a render).
  useEffect(() => notices.expire(now), [notices, now]);
  return useMemo(
    () => presentList(props.meActor, props.mode, live, changes, now),
    [props.meActor, props.mode, live, changes, now]
  );
}

export interface IPresenceButtonProps extends ILogShared {
  readonly expanded: boolean;
  readonly onToggle: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export function PresenceButton(props: IPresenceButtonProps) {
  const present = usePresent(props);
  const stacked = stackOrder(present);
  const people = present.filter((p) => !p.actor.agent).length;
  const members = stacked.map((p) => ({
    id: p.actor.key,
    name: `${p.actor.name}${p.you ? ' (you)' : ''} · ${p.status}`,
    colour: p.actor.colour,
    initials: p.actor.initials,
    agent: p.actor.agent,
    active: p.active,
  }));
  const group = (
    <AvatarGroup
      members={members}
      max={STACK}
      size="md"
      label="Here now"
      labels={{ showMore: 'Show all {count} more here now' }}
      onMore={props.onToggle}
      moreOpen={props.expanded}
    />
  );
  return (
    <>
      <span className="inline-flex h-9 flex-none items-center @max-[470px]/pane:hidden!">
        {stacked.length > STACK ? (
          group
        ) : (
          // Nobody hidden, so no +N: the faces themselves open the roster.
          <button
            type="button"
            className="inline-flex items-center rounded-full"
            aria-label={whoLabelOf(present)}
            aria-expanded={props.expanded}
            onClick={props.onToggle}
          >
            {group}
          </button>
        )}
      </span>
      <button
        type="button"
        className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full bg-fill-2 px-3.5 text-[13px] font-bold @min-[471px]/pane:hidden!"
        aria-label={whoLabelOf(present)}
        aria-expanded={props.expanded}
        onClick={props.onToggle}
      >
        <Icon name="person" size={14} />
        {people}
      </button>
    </>
  );
}

// The caret of an actor, from awareness (cursor.head is a Yjs relative position).
function cursorOf(
  editor: Editor,
  userId: string,
  awarenessStates: Map<number, Record<string, unknown>>
): number | null {
  const binding: unknown = ySyncPluginKey.getState(editor.state)?.binding;
  if (isNil(binding)) return null;
  for (const state of awarenessStates.values()) {
    const user: unknown = state['user'];
    const cursor: unknown = state['cursor'];
    if (isNil(user) || isNil(cursor) || Reflect.get(Object(user), 'userId') !== userId) continue;
    const head: unknown = Reflect.get(Object(cursor), 'head');
    if (isNil(head)) continue;
    const doc: unknown = Reflect.get(Object(binding), 'doc');
    const type: unknown = Reflect.get(Object(binding), 'type');
    const mapping: unknown = Reflect.get(Object(binding), 'mapping');
    if (!(doc instanceof Y.Doc) || !(type instanceof Y.XmlFragment) || !(mapping instanceof Map))
      return null;
    return relativePositionToAbsolutePosition(
      doc,
      type,
      Y.createRelativePositionFromJSON(head),
      mapping
    );
  }
  return null;
}

export interface IHereNowProps extends ILogShared {
  readonly at: IPopAt;
  readonly states: () => Map<number, Record<string, unknown>>;
}

export function HereNow(props: IHereNowProps) {
  const present = usePresent(props);
  const { editor } = props;
  const states = props.states();
  const jump = (userId: string): void => {
    const pos = cursorOf(editor, userId, states);
    if (isNil(pos)) return;
    props.setMenu(Menu.None);
    editor.chain().setTextSelection(pos).scrollIntoView().focus().run();
  };
  return (
    <div
      className="pop absolute z-41 flex w-[320px] max-w-[calc(100%-16px)] flex-col p-2"
      role="dialog"
      aria-label="Who is here"
      style={{ top: props.at.top, left: props.at.left }}
    >
      <div className="flex items-baseline gap-1.5 px-2.5 pt-2 pb-2.5 text-[14px]">
        <strong>Here now</strong>
        <span className="text-[12px] font-semibold text-neutral-4">({summaryOf(present)})</span>
      </div>
      {/* Five rows (46 px each) show; more scroll. */}
      <div className="scroll-thin flex max-h-[232px] flex-col gap-0.5 overflow-y-auto">
        {present.map((p) => {
          const look = statusLooks[p.status];
          // Only someone with a caret on the page (an editor, not a reader) can be jumped to.
          const jumpable =
            !p.you && !p.actor.agent && isNotNil(cursorOf(editor, p.actor.key, states));
          return (
            <div
              key={p.actor.key}
              className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 text-left text-primary-9 transition-colors hover:bg-fill-item-hover"
            >
              <Avatar actor={p.actor} size={30} ring={p.active} />
              <div className="min-w-0 flex-1 text-[14px] font-semibold">
                <div className="truncate">
                  {p.actor.name}
                  {p.you ? ' (you)' : ''}
                </div>
                <div className="text-[12px] font-normal text-neutral-4">{p.sub}</div>
              </div>
              <span
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                style={{ color: look.fg }}
              >
                <span className="size-[7px] rounded-full" style={{ background: look.dot }} />
                <span className="capitalize">{p.status}</span>
              </span>
              {jumpable ? (
                <button
                  type="button"
                  className="icon-btn size-7"
                  aria-label={`Go to ${p.actor.name}`}
                  title="Go to their cursor"
                  onClick={() => jump(p.actor.key)}
                >
                  <Icon name="arrowRight" size={14} />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
