import { EditorContent } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';
import { useRef, useState } from 'react';

import { PageKind, ReadOnlyReason } from '@/api/logbook/types';
import { useArtifacts } from '@/features/logbook/api/log-files';
import { useRenamePage } from '@/features/logbook/api/pages';
import { useUpdateLog } from '@/features/logbook/api/research-logs';
import { useCollaboration } from '@/features/logbook/collaboration/notices';
import { CONTROL, POPOVER_PANEL } from '@/features/logbook/constants';
import { FormatBar } from '@/features/logbook/editor/format-bar';
import { PageLinkMenu } from '@/features/logbook/editor/page-link-menu';
import { SelectionMenu } from '@/features/logbook/editor/selection-menu';
import { ArtifactIcon } from '@/features/logbook/log/artifact-icon';
import { ArtifactBar, ArtifactView } from '@/features/logbook/log/artifact-view';
import { EditorTabs } from '@/features/logbook/log/editor-tabs';
import { InsertMenu } from '@/features/logbook/log/menus';
import { reasonOf } from '@/features/logbook/log/notice';
import { PresenceButton } from '@/features/logbook/log/presence';
import { SaveStatus } from '@/features/logbook/log/save-status';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { cn } from '@/utils/css-class';

import type { MouseEvent as ReactMouseEvent } from 'react';
import type {
  IClock,
  IEditorCardProps,
  IEditorTab,
  ITabRef,
  TMobileTab,
} from '@/features/logbook/types';

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
  const body = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState<IClock | null>(null);
  const rejoinAt = useCollaboration(props.notices, (state) => state.rejoinAt);
  const update = useUpdateLog(props.project);
  const renamePage = useRenamePage(props.logId, props.project);
  const files = useArtifacts(props.logId, props.project).data ?? [];
  const artifact = files.find((file) => file.id === props.artifactId) ?? null;
  const title = log?.name ?? 'Research log';
  const main = props.pages.find((page) => page.kind === PageKind.Main);
  const pageTab: ITabRef = { kind: TabKind.Page, id: props.page.id };
  const canRename = isNotNil(log) && props.readOnly !== ReadOnlyReason.ReadAccess;
  const notSaved = (error: unknown): never => {
    props.setNotice({
      kind: NoticeKind.Error,
      title: 'The new name was not saved',
      description: reasonOf(error),
    });
    throw error;
  };
  const renameLog = (name: string) => update.mutateAsync({ id: props.logId, name }).catch(notSaved);
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
            onRename: canRename ? renameLog : null,
          },
        ]),
    ...props.tabs.flatMap((tab): IEditorTab[] => {
      if (tab.kind === TabKind.Page) {
        const listed = props.pages.find((item) => item.id === tab.id);
        const page = tab.id === props.page.id ? props.page : listed;
        if (isNil(page)) return [];
        const target = listed ?? page;
        return [
          {
            tab,
            label: page.title,
            hint: `${title} / ${page.title}`,
            icon: <Icon name="page" size={15} />,
            pinned: false,
            onRename: canRename
              ? (name) => renamePage.mutateAsync({ page: target, title: name }).catch(notSaved)
              : null,
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
          onRename: null,
        },
      ];
    }),
  ];

  const offsets = useRef<{ doc: unknown; list: number[] }>({ doc: null, list: [] });
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

  const track = (event: ReactMouseEvent<HTMLDivElement>): void => {
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
      className="logbook-card @container/pane relative z-2 flex min-h-0 min-w-0 flex-col overflow-hidden data-[collapsed=true]:overflow-visible"
      data-collapsed={!writeTab}
      style={props.style}
      aria-label={narrow ? 'Log toolbar and editor' : 'Editor'}
    >
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
      <header
        className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2.5 data-[rule=true]:border-b data-[rule=true]:border-rule max-md:px-2.5"
        data-rule={writeTab}
      >
        {isNotNil(artifact) ? (
          <ArtifactBar artifact={artifact} onOpenPage={openCopiedPage} />
        ) : (
          <>
            <PresenceButton {...props} />
            <Popover
              open={menu === Menu.Insert}
              onOpenChange={(open) => setMenu(open ? Menu.Insert : Menu.None)}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    CONTROL,
                    'ml-auto bg-fill-2 text-primary-9 hover:bg-fill-item-hover disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                  aria-label="Insert"
                  title="Link entities or upload a file"
                  disabled={isNotNil(props.readOnly) || props.outdated || props.deleted}
                >
                  <Icon name="plus" size={15} stroke={2.4} />
                  <span className="@max-[420px]/pane:hidden!">Insert</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={8}
                collisionPadding={8}
                className={cn(
                  POPOVER_PANEL,
                  'z-71 flex w-[292px] max-w-[calc(100vw-16px)] flex-col p-1.5 text-primary-9'
                )}
                aria-label="Insert"
                onCloseAutoFocus={(event) => {
                  if (menu === Menu.Picker) event.preventDefault();
                }}
              >
                <InsertMenu
                  editor={editor}
                  onClose={() => setMenu(Menu.None)}
                  onPicker={() => setMenu(Menu.Picker)}
                  onNotice={props.setNotice}
                />
              </PopoverContent>
            </Popover>
          </>
        )}
        <button
          type="button"
          className={cn(CONTROL, 'bg-green-main text-white shadow-green-btn')}
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
          disabled={
            isNotNil(props.readOnly) || props.outdated || isNotNil(rejoinAt) || props.deleted
          }
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
      {props.outdated && onLog ? (
        <p
          className="m-0 flex items-center gap-3 bg-warning-tint px-6 py-2 text-[13px] text-warning-ink"
          role="status"
        >
          <span className="min-w-0 flex-1">
            A newer version of the logbook wrote something on this page. Reload to see all of it and
            keep writing.
          </span>
          <button
            type="button"
            className="flex-none rounded-full border-0 bg-white px-3 py-1 text-[12.5px] font-bold text-primary-9"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
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
        <PageLinkMenu editor={editor} pageId={props.page.id} />
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
    </section>
  );
}
