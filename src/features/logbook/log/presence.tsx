import { useEditorState } from '@tiptap/react';
import { relativePositionToAbsolutePosition, ySyncPluginKey } from '@tiptap/y-tiptap';
import { isNil, isNotNil } from 'es-toolkit';
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import * as Y from 'yjs';

import { CLOCK_MS, POPOVER_PANEL, PRESENCE_STACK } from '@/features/logbook/constants';
import { useNow } from '@/features/logbook/helpers';
import {
  presentList,
  stackOrder,
  statusLooks,
  summaryOf,
  whoLabelOf,
} from '@/features/logbook/log/presence-state';
import { Menu } from '@/features/logbook/types';
import { Avatar } from '@/ui/molecules/avatar';
import { Icon } from '@/ui/molecules/icon';
import { Popover, PopoverAnchor, PopoverContent } from '@/ui/molecules/popover';
import { AvatarGroup } from '@/ui/segments/avatar-group';
import { cn } from '@/utils/css-class';

import type { Editor } from '@tiptap/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { ILogShared, IPresent } from '@/features/logbook/types';

function usePresent(props: ILogShared): IPresent[] {
  const now = useNow(CLOCK_MS, props.shown);
  const live = useSyncExternalStore(props.notices.subscribe, props.notices.snapshot);
  const changes = useSyncExternalStore(props.feed.subscribe, props.feed.snapshot);
  const { notices } = props;
  useEffect(() => notices.expire(now), [notices, now]);
  return useMemo(
    () => presentList(props.meActor, props.mode, live, changes, now),
    [props.meActor, props.mode, live, changes, now]
  );
}

export function PresenceButton(props: ILogShared) {
  const { menu, setMenu } = props;
  const present = usePresent(props);
  const anchor = useRef<HTMLSpanElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const expanded = menu === Menu.Who;
  const toggle = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    opener.current = event.currentTarget;
    setMenu(expanded ? Menu.None : Menu.Who);
  };
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
      max={PRESENCE_STACK}
      size="md"
      label="Here now"
      labels={{ showMore: (count) => `Show all ${count} more here now` }}
      onMore={toggle}
      moreOpen={expanded}
    />
  );
  return (
    <Popover open={expanded} onOpenChange={(open) => setMenu(open ? Menu.Who : Menu.None)}>
      <PopoverAnchor asChild>
        <span ref={anchor} className="inline-flex flex-none">
          <span className="inline-flex h-9 flex-none items-center @max-[470px]/pane:hidden!">
            {stacked.length > PRESENCE_STACK ? (
              group
            ) : (
              <button
                type="button"
                className="inline-flex items-center rounded-full"
                aria-label={whoLabelOf(present)}
                aria-expanded={expanded}
                onClick={toggle}
              >
                {group}
              </button>
            )}
          </span>
          <button
            type="button"
            className="inline-flex h-9 flex-none items-center gap-1.5 rounded-full bg-fill-2 px-3.5 text-[13px] font-bold @min-[471px]/pane:hidden!"
            aria-label={whoLabelOf(present)}
            aria-expanded={expanded}
            onClick={toggle}
          >
            <Icon name="person" size={14} />
            {people}
          </button>
        </span>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={8}
        className={cn(
          POPOVER_PANEL,
          'z-71 flex w-[320px] max-w-[calc(100vw-16px)] flex-col p-2 text-primary-9'
        )}
        aria-label="Who is here"
        onInteractOutside={(event) => {
          if (event.target instanceof Node && anchor.current?.contains(event.target))
            event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (document.activeElement === document.body) opener.current?.focus();
        }}
      >
        <HereNow {...props} />
      </PopoverContent>
    </Popover>
  );
}

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

function HereNow(props: ILogShared) {
  const present = usePresent(props);
  const { editor, awarenessStates: states } = props;
  // Rerun per transaction: the caret plugin dispatches one when someone's caret moves.
  const jumpable = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      present
        .filter(
          (p) => !p.you && !p.actor.agent && isNotNil(cursorOf(current, p.actor.key, states()))
        )
        .map((p) => p.actor.key)
        .join('\n'),
  });
  const jump = (userId: string): void => {
    const pos = cursorOf(editor, userId, states());
    if (isNil(pos)) return;
    props.setMenu(Menu.None);
    editor.chain().setTextSelection(pos).scrollIntoView().focus().run();
  };
  return (
    <>
      <div className="flex items-baseline gap-1.5 px-2.5 pt-2 pb-2.5 text-[14px]">
        <strong>Here now</strong>
        <span className="text-[12px] font-semibold text-neutral-4">({summaryOf(present)})</span>
      </div>
      <div className="scroll-thin flex max-h-[232px] flex-col gap-0.5 overflow-y-auto">
        {present.map((p) => {
          const look = statusLooks[p.status];
          const canJump = jumpable.split('\n').includes(p.actor.key);
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
              {canJump ? (
                <button
                  type="button"
                  className="logbook-icon-btn size-7"
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
    </>
  );
}
