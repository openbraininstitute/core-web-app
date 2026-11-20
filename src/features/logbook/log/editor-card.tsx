// The editor stays mounted (hidden) under artifact tabs, so caret, history and sync survive.
import { useQuery } from '@tanstack/react-query';
import { EditorContent } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';
import { useMemo, useRef, useState } from 'react';

import { PageKind, ReadOnlyReason } from '@/api/logbook/types';
import { artifactsOf, logFilesQuery } from '@/features/logbook/api/log-files';
import { useUpdateLog } from '@/features/logbook/api/research-logs';
import { useCollaboration } from '@/features/logbook/collaboration/notices';
import { FormatBar } from '@/features/logbook/editor/format-bar';
import { SelectionMenu } from '@/features/logbook/editor/selection-menu';
import { ArtifactIcon } from '@/features/logbook/log/artifact-icon';
import { ArtifactBar, ArtifactView } from '@/features/logbook/log/artifact-view';
import { CONTROL } from '@/features/logbook/log/controls';
import { EditorTabs } from '@/features/logbook/log/editor-tabs';
import { InsertMenu } from '@/features/logbook/log/menus';
import { reasonOf } from '@/features/logbook/log/notice';
import { HereNow, PresenceButton } from '@/features/logbook/log/presence';
import { SaveStatus } from '@/features/logbook/log/save-status';
import { CARD_MENUS } from '@/features/logbook/log/ui-state';
import {
  Layout,
  Menu,
  MobileTab,
  NoticeKind,
  RightTab,
  TabKind,
  ViewMode,
} from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';

import type { MouseEvent as ReactMouseEvent } from 'react';
import type {
  IClock,
  IEditorCardProps,
  IEditorTab,
  IPopAt,
  ITabRef,
  TMenu,
  TMobileTab,
} from '@/features/logbook/types';

const WIDTHS: Readonly<Partial<Record<TMenu, number>>> = {
  [Menu.Insert]: 292,
  [Menu.Who]: 320,
};

// Under the button, clamped inside the card.
export function popAtOf(button: HTMLElement, card: HTMLElement, width: number): IPopAt {
  const b = button.getBoundingClientRect();
  const c = card.getBoundingClientRect();
  return {
    top: b.bottom - c.top + 8,
    left: Math.max(8, Math.min(b.right - c.left - width, c.width - width - 8)),
  };
}

const MOBILE_TABS: readonly { readonly tab: TMobileTab; readonly label: string }[] = [
  { tab: MobileTab.Write, label: 'Write' },
  { tab: MobileTab.Preview, label: 'Preview' },
  { tab: MobileTab.History, label: 'History' },
  { tab: MobileTab.Artifacts, label: 'Artifacts' },
];

const KIND_NAMES: Readonly<Record<string, string>> = {
  heading: 'heading',
  paragraph: 'paragraph',
  bulletList: 'list',
  orderedList: 'list',
  blockquote: 'quote',
  codeBlock: 'code block',
  table: 'table',
  figure: 'figure',
  entity: 'entity',
  file: 'file',
  callout: 'note',
};

export function EditorCard(props: IEditorCardProps) {
  const { editor, layout, menu, setMenu, selection, log } = props;
  const narrow = layout === Layout.Narrow;
  const card = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [popAt, setPopAt] = useState<IPopAt>({ top: 52, left: 8 });
  const [clock, setClock] = useState<IClock | null>(null);
  // Set while a busy-server refusal is being retried.
  const rejoinAt = useCollaboration(props.notices, (state) => state.rejoinAt);
  const update = useUpdateLog(props.project);
  const listing = useQuery(logFilesQuery(props.logId, props.project));
  const files = useMemo(
    () => (isNil(listing.data) ? [] : artifactsOf(listing.data)),
    [listing.data]
  );
  const artifact = files.find((file) => file.id === props.artifactId) ?? null;
  const title = log?.name ?? 'Research log';
  const main = props.pages.find((page) => page.kind === PageKind.Main);
  const pageTab: ITabRef = { kind: TabKind.Page, id: props.page.id };
  const tabs: IEditorTab[] = [
    ...(isNil(main)
      ? []
      : [
          {
            tab: { kind: TabKind.Page, id: main.id },
            label: title,
            hint: title,
            icon: <Icon name="notebook" size={15} />,
            pinned: true,
          },
        ]),
    ...props.tabs.flatMap((tab): IEditorTab[] => {
      if (tab.kind === TabKind.Page) {
        // The page on screen may have left the list (deleted while shown).
        const page =
          tab.id === props.page.id ? props.page : props.pages.find((item) => item.id === tab.id);
        if (isNil(page)) return [];
        return [
          {
            tab,
            label: page.title,
            hint: `${title} / ${page.title}`,
            icon: <Icon name="page" size={15} />,
            pinned: false,
          },
        ];
      }
      const file = files.find((item) => item.id === tab.id);
      if (isNil(file)) return [];
      return [
        {
          tab,
          label: file.name,
          hint: `${file.name} (read-only)`,
          icon: <ArtifactIcon artifact={file} size={20} />,
          pinned: false,
        },
      ];
    }),
  ];

  // Reads the card's box on click, never during render.
  const toggle = (which: TMenu, event: ReactMouseEvent<HTMLButtonElement>): void => {
    if (menu === which) {
      setMenu(Menu.None);
      return;
    }
    if (isNotNil(card.current))
      setPopAt(popAtOf(event.currentTarget, card.current, WIDTHS[which] ?? 280));
    setMenu(which);
  };

  // Rebuilt only when the document changes.
  const offsets = useRef<{ doc: unknown; list: number[] }>({ doc: null, list: [] });
  // By height only, so moving sideways onto the clock keeps the same block.
  const blockAt = (y: number): number | null => {
    const doc = editor.state.doc;
    if (offsets.current.doc !== doc) {
      const list: number[] = [];
      doc.forEach((_node, offset) => list.push(offset));
      offsets.current = { doc, list };
    }
    const list = offsets.current.list;
    let lo = 0;
    let hi = list.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const dom = editor.view.nodeDOM(list[mid] ?? 0);
      if (!(dom instanceof HTMLElement)) return null;
      const rect = dom.getBoundingClientRect();
      if (y < rect.top) hi = mid - 1;
      else if (y >= rect.bottom) lo = mid + 1;
      else return list[mid] ?? null;
    }
    return list[hi] ?? null;
  };

  // One clock for the hovered block, not one per block.
  const track = (event: ReactMouseEvent<HTMLDivElement>): void => {
    // On the clock itself: keep it where it is.
    if (event.target instanceof Element && isNotNil(event.target.closest('[data-clock]'))) return;
    const host = body.current;
    const from = blockAt(event.clientY);
    if (isNil(host) || isNil(from) || clock?.from === from) return;
    const block = editor.state.doc.nodeAt(from);
    const dom = editor.view.nodeDOM(from);
    if (isNil(block) || !(dom instanceof HTMLElement)) return;
    const top = dom.getBoundingClientRect().top - host.getBoundingClientRect().top + host.scrollTop;
    setClock({
      top,
      from,
      to: from + block.nodeSize,
      kind: KIND_NAMES[block.type.name] ?? 'block',
    });
  };

  const writeTab = !narrow || props.mTab === MobileTab.Write;
  const onLog = isNil(artifact);
  const copied = props.pages.find((page) => page.id === artifact?.pageId);
  const openCopiedPage = isNil(copied) ? null : () => props.onOpenPage(copied);
  const whoWrote =
    onLog &&
    isNotNil(selection) &&
    (narrow
      ? props.mTab === MobileTab.Write
      : !props.sideOpen || props.rightTab !== RightTab.History);

  return (
    <section
      ref={card}
      className="logbook-card @container/pane relative z-2 flex min-h-0 min-w-0 flex-col overflow-hidden data-[collapsed=true]:overflow-visible"
      data-collapsed={!writeTab}
      style={props.style}
      aria-label={narrow ? 'Log toolbar and editor' : 'Editor'}
    >
      {/* Row 1: tabs */}
      <div className="flex items-end gap-1 rounded-t-[24px] bg-soft pt-2 pr-2 pl-2">
        {narrow ? (
          <button
            type="button"
            className="mb-1.5 grid size-9 flex-none place-items-center rounded-full text-primary-9 hover:bg-white"
            aria-label="Open the list of logs"
            title="All logs"
            onClick={props.onOpenList}
          >
            <Icon name="menu" size={16} />
          </button>
        ) : null}
        <EditorTabs
          tabs={tabs}
          active={isNil(artifact) ? pageTab : { kind: TabKind.Artifact, id: artifact.id }}
          page={pageTab}
          status={<SaveStatus notices={props.notices} copy={props.copy} iconOnly={narrow} />}
          canRename={isNotNil(log) && props.readOnly !== ReadOnlyReason.ReadAccess}
          onRename={(name) =>
            update.mutateAsync({ id: props.logId, name }).catch((error: unknown) => {
              props.setNotice({
                kind: NoticeKind.Error,
                title: 'The new name was not saved',
                description: reasonOf(error),
              });
              throw error;
            })
          }
          onSelect={props.onSelectTab}
          onClose={props.onCloseTab}
        />
        {props.canShut ? (
          <button
            type="button"
            className="mb-1.5 grid size-9 flex-none place-items-center rounded-full text-neutral-4 hover:bg-white hover:text-primary-9"
            aria-label="Close the editor"
            title="Close the editor"
            onClick={props.onShut}
          >
            <Icon name="close" size={14} stroke={2.4} />
          </button>
        ) : null}
      </div>
      {/* Row 2: actions, or the artifact's details */}
      <header
        className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2.5 data-[rule=true]:border-b data-[rule=true]:border-rule max-md:px-2.5"
        data-rule={writeTab}
      >
        {isNotNil(artifact) ? (
          <ArtifactBar artifact={artifact} onOpenPage={openCopiedPage} />
        ) : (
          <>
            <PresenceButton
              {...props}
              expanded={menu === Menu.Who}
              onToggle={(event) => toggle(Menu.Who, event)}
            />
            <button
              type="button"
              className={`${CONTROL} ml-auto bg-fill-2 text-primary-9 hover:bg-fill-item-hover disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label="Insert"
              aria-expanded={menu === Menu.Insert}
              title="Link entities or upload a file"
              disabled={isNotNil(props.readOnly) || props.deleted}
              onClick={(event) => toggle(Menu.Insert, event)}
            >
              <Icon name="plus" size={15} stroke={2.4} />
              <span className="@max-[420px]/pane:hidden!">Insert</span>
            </button>
          </>
        )}
        <button
          type="button"
          className={`${CONTROL} bg-green-main text-white shadow-green-btn`}
          onClick={() => props.onMode(ViewMode.Read)}
        >
          <Icon name="check" size={15} stroke={2.6} />
          Close
        </button>
        {narrow ? (
          <div
            className="flex basis-full gap-0.5 rounded-full bg-fill-2 p-[3px]"
            role="tablist"
            aria-label="View"
          >
            {MOBILE_TABS.map(({ tab, label }) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={props.mTab === tab}
                className="relative h-9 flex-1 rounded-full bg-transparent px-[6px] py-px text-[14px] font-bold text-neutral-4 aria-selected:bg-white aria-selected:text-primary-9 aria-selected:shadow-seg-on"
                onClick={() => props.setMTab(tab)}
              >
                {label}
                {tab === MobileTab.History && isNotNil(selection) && props.mTab !== tab ? (
                  <span className="absolute top-2 right-[14px] size-1.5 rounded-full bg-primary-6" />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </header>
      {writeTab && onLog ? (
        <FormatBar
          editor={editor}
          disabled={isNotNil(props.readOnly) || isNotNil(rejoinAt) || props.deleted}
        />
      ) : null}
      {writeTab && isNotNil(artifact) ? (
        <ArtifactView key={artifact.id} artifact={artifact} />
      ) : null}
      {props.deleted && onLog ? (
        <p className="m-0 bg-warning-tint px-6 py-2 text-[13px] text-warning-ink" role="status">
          This section was deleted. What it held stays shown here until you leave it; changes are no
          longer saved.
        </p>
      ) : null}
      {isNotNil(props.readOnly) && onLog && !props.deleted ? (
        <p className="m-0 bg-warning-tint px-6 py-2 text-[13px] text-warning-ink" role="status">
          {props.readOnly === ReadOnlyReason.ReadAccess
            ? 'You can read this log, not change it.'
            : 'The page cannot take changes right now; what you type is kept and sent when it can.'}
        </p>
      ) : null}
      {isNotNil(rejoinAt) && isNil(props.readOnly) && onLog ? (
        <p className="m-0 bg-warning-tint px-6 py-2 text-[13px] text-warning-ink" role="status">
          The server is busy. The page is shown from this device and joins again by itself soon.
        </p>
      ) : null}
      <div
        ref={body}
        className="scroll-thin relative min-h-0 flex-1 overflow-y-auto"
        hidden={!writeTab || !onLog}
        onMouseMove={track}
        onMouseLeave={() => setClock(null)}
      >
        <EditorContent editor={editor} className="rl-editor" data-flags={props.settings.flags} />
        <SelectionMenu editor={editor} />
        {isNotNil(clock) ? (
          <button
            type="button"
            className="absolute right-3 grid size-[26px] place-items-center rounded-full bg-white text-neutral-4 shadow-block-btn hover:text-primary-9"
            data-clock
            style={{ top: clock.top + 2 }}
            aria-label={`History of this ${clock.kind}`}
            title="Who wrote this"
            onClick={() => props.showHistory({ from: clock.from, to: clock.to })}
          >
            <Icon name="clock" size={13} />
          </button>
        ) : null}
      </div>
      {whoWrote && writeTab ? (
        <button
          type="button"
          className="absolute right-4 bottom-4 z-6 inline-flex h-9 items-center gap-2 rounded-full bg-primary-9 px-[14px] text-[13px] font-bold text-white shadow-who-wrote"
          onClick={() => props.showHistory(null)}
        >
          <Icon name="clock" size={14} />
          Who wrote this?
        </button>
      ) : null}
      {CARD_MENUS.has(menu) ? (
        <button
          type="button"
          className="absolute inset-0 z-40 cursor-default border-0 bg-transparent"
          aria-label="Close menu"
          tabIndex={-1}
          onClick={() => setMenu(Menu.None)}
        />
      ) : null}
      {menu === Menu.Insert ? (
        <InsertMenu
          editor={editor}
          at={popAt}
          onClose={() => setMenu(Menu.None)}
          onPicker={() => setMenu(Menu.Picker)}
          onNotice={props.setNotice}
        />
      ) : null}
      {menu === Menu.Who ? <HereNow {...props} at={popAt} states={props.awarenessStates} /> : null}
    </section>
  );
}
