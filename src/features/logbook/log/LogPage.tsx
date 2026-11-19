// The editor never re-renders React on a keystroke; toolbars subscribe to the one field they show.
import { useHocuspocusProvider } from '@hocuspocus/provider-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEditor } from '@tiptap/react';
import { clamp, isNil, isNotNil } from 'es-toolkit';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { PageKind } from '@/api/logbook/types';
import { actorOfWriter, writersQuery } from '@/features/logbook/api/writers';
import { Layout } from '@/features/logbook/board/layout';
import { personActor, resolveActor } from '@/features/logbook/collaboration/actors';
import { usePauseWhenHidden } from '@/features/logbook/collaboration/idle';
import { useRejoin } from '@/features/logbook/collaboration/rejoin';
import { editorExtensions } from '@/features/logbook/editor/extensions';
import { insertAfterBlock } from '@/features/logbook/editor/insert';
import { EntityPickerContext } from '@/features/logbook/log/context';
import { EditorCard } from '@/features/logbook/log/EditorCard';
import { EntityGridPicker } from '@/features/logbook/log/EntityGridPicker';
import { useNotifySettings } from '@/features/logbook/log/notify-settings';
import { ReadCard } from '@/features/logbook/log/ReadCard';
import { SidePane } from '@/features/logbook/log/SidePane';
import { AgentToast, NoticeToast, ToastStack } from '@/features/logbook/log/Toasts';
import { CARD_MENUS, Menu, MobileTab, RightTab, takeSeed } from '@/features/logbook/log/ui-state';
import { ViewMode } from '@/features/logbook/log/view-mode';
import { dragHandle } from '@/features/logbook/ui/drag';
import { cn } from '@/utils/css-class';

import type { Editor } from '@tiptap/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { TReadOnlyReason, TValueOf } from '@/api/logbook/types';
import type { ChangeFeed } from '@/features/logbook/collaboration/changes';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import type { IPickedEntity, TOpenEntityPicker } from '@/features/logbook/log/context';
import type { IPageViewProps } from '@/features/logbook/log/LogView';
import type { INotice } from '@/features/logbook/log/notice';
import type { INotifySettings } from '@/features/logbook/log/notify-settings';
import type { ISelection, TMenu, TMobileTab, TRightTab } from '@/features/logbook/log/ui-state';
import type { IActor } from '@/features/logbook/ui/Avatar';

const PANE_FLOOR = 300;
const PANE_SHUT_BELOW = 150;

export interface ILogPageProps extends IPageViewProps {
  readonly notices: CollaborationNotices;
  readonly feed: ChangeFeed;
  readonly copy: LocalCopy;
  // When this visit began (ISO): saved activity ends here, the live feed starts.
  readonly openedAt: string;
}

const SHUT =
  'logbook-card flex w-[42px] flex-none justify-center border-0 px-0 py-5 transition-[background] duration-150 ease-[ease] hover:bg-soft';
const SHUT_LABEL = 'label-caps [writing-mode:vertical-rl]';

// The phone's Write tab has no side pane; other tabs map to the pane tab of the same name.
const RIGHT_TAB_OF_MOBILE: Readonly<Record<TMobileTab, TRightTab>> = {
  [MobileTab.Write]: RightTab.Preview,
  [MobileTab.Preview]: RightTab.Preview,
  [MobileTab.History]: RightTab.History,
  [MobileTab.Artifacts]: RightTab.Artifacts,
};
const TAB_NAMES: Readonly<Record<TRightTab, string>> = {
  [RightTab.Preview]: 'Preview',
  [RightTab.History]: 'History',
  [RightTab.Artifacts]: 'Artifacts',
};

const SplitShut = { None: 'none', Editor: 'editor', Side: 'side' } as const;
type TSplitShut = TValueOf<typeof SplitShut>;

export function LogPage(props: ILogPageProps) {
  const { me, log, layout, mode, notices, feed, logId, copy } = props;
  const provider = useHocuspocusProvider();
  // A tab hidden for a while drops its socket so the server can unload the page.
  usePauseWhenHidden(provider);

  // On `saved`, the local copy is clean once the provider has nothing unsent.
  useEffect(() => {
    let last = notices.snapshot().savedAt;
    return notices.subscribe(() => {
      const at = notices.snapshot().savedAt;
      if (at === last) return;
      last = at;
      copy.markClean(provider);
    });
  }, [notices, copy, provider]);
  const narrow = layout === Layout.Narrow;
  const meActor = useMemo(() => personActor(me.userId, me.name), [me.userId, me.name]);
  const [settings] = useNotifySettings();
  // The editor reads the latest settings through this; written after render, never during.
  const settingsRef = useRef(settings);
  useLayoutEffect(() => {
    settingsRef.current = settings;
  });

  // Awareness maps a Yjs client to a user id; the server's list names the user.
  const { awareness } = provider;
  if (isNil(awareness)) throw new Error('The live page has no awareness');
  // Writers the server named for unknown clients; asked once per view, a failed ask retries.
  const queries = useQueryClient();
  const [written, setWritten] = useState<ReadonlyMap<number, IActor>>(() => new Map());
  const asked = useRef(new Set<number>());
  const learnWriters = useCallback(
    (clientIds: readonly number[]): void => {
      const wanted = clientIds.filter(
        (id) => id !== provider.document.clientID && !asked.current.has(id)
      );
      if (wanted.length === 0) return;
      for (const id of wanted) asked.current.add(id);
      queries
        .fetchQuery(
          writersQuery(
            props.project,
            props.page.id,
            wanted.toSorted((a, b) => a - b)
          )
        )
        .then((items) => {
          if (items.length === 0) return;
          setWritten((known) => {
            const next = new Map(known);
            for (const item of items) next.set(item.clientId, actorOfWriter(item));
            return next;
          });
        })
        .catch(() => {
          for (const id of wanted) asked.current.delete(id);
        });
    },
    [queries, provider, props.project, props.page.id]
  );
  const resolve = useCallback(
    (clientId: number) =>
      clientId === provider.document.clientID
        ? meActor
        : resolveActor(clientId, {
            awareness,
            peers: () => notices.snapshot().peers,
            agents: () => notices.snapshot().agents,
            // `writer` notices name changes as they land; the writers API fills in the rest later.
            written: (id) => {
              const announced = notices.writerOf(id);
              return isNil(announced) ? written.get(id) : actorOfWriter(announced);
            },
          }),
    [provider, awareness, notices, meActor, written]
  );

  const editor = useEditor(
    {
      extensions: editorExtensions({
        provider,
        me: meActor,
        feed,
        resolve,
        caretName: (user) => {
          const peer = notices.snapshot().peers.find((p) => p.userId === user['userId']);
          return peer?.label ?? 'Someone';
        },
        highlights: () => settingsRef.current.highlights,
        ready: () => provider.isSynced,
      }),
      editable: mode === ViewMode.Edit,
      shouldRerenderOnTransaction: false,
      immediatelyRender: true,
    },
    [provider]
  );

  // A new log starts with its title as the first heading, main page only.
  const isMain = props.page.kind === PageKind.Main;
  useEffect(() => {
    const seed = (): void => {
      if (!isMain || provider.document.getXmlFragment('default').length > 0 || !takeSeed(logId))
        return;
      editor.commands.setContent(`# ${log?.name ?? 'Untitled log'}\n\n`, {
        contentType: 'markdown',
      });
    };
    if (provider.isSynced) seed();
    provider.on('synced', seed);
    return () => {
      provider.off('synced', seed);
    };
  }, [provider, editor, logId, log?.name, isMain]);

  const readOnly = useSyncExternalStore(notices.subscribe, () => notices.snapshot().readOnly);
  // Read-only until rejoined: the server resets a socket after 1000 messages sent before join.
  useRejoin(provider, notices);
  const rejoinAt = useSyncExternalStore(notices.subscribe, () => notices.snapshot().rejoinAt);
  const canEdit = mode === ViewMode.Edit && isNil(readOnly) && isNil(rejoinAt) && !props.deleted;
  useEffect(() => {
    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  const [menu, setMenu] = useState<TMenu>(Menu.None);
  // Set when a card replaces its entity; otherwise a pick inserts a new card.
  const [pickTarget, setPickTarget] = useState<((entity: IPickedEntity) => void) | null>(null);
  const openEntityPicker = useCallback<TOpenEntityPicker>((onPick) => {
    setPickTarget(() => onPick);
    setMenu(Menu.Picker);
  }, []);
  // Any other menu change drops a pending replace, so a later plain link never replaces a card.
  const changeMenu = useCallback((next: TMenu): void => {
    setPickTarget(null);
    setMenu(next);
  }, []);
  // All picks go in with one edit, in the order picked.
  const insertEntities = (entities: readonly IPickedEntity[]): void => {
    insertAfterBlock(
      editor,
      entities.map((entity) => ({
        type: 'entity',
        attrs: { label: entity.name, type: entity.type, entityId: entity.id },
      }))
    );
  };
  const [split, setSplit] = useState(0.5);
  const [splitShut, setSplitShut] = useState<TSplitShut>(SplitShut.None);
  const [rightTab, setRightTab] = useState<TRightTab>(RightTab.Preview);
  const [mTab, setMTab] = useState<TMobileTab>(MobileTab.Write);
  const [selection, setSelection] = useState<ISelection | null>(null);
  // Each notice gets its own id, so a new one restarts the timer even with the same words.
  const [notice, setShownNotice] = useState<(INotice & { readonly id: number }) | null>(null);
  const noticeId = useRef(0);
  const setNotice = useCallback((next: INotice | null): void => {
    noticeId.current += 1;
    setShownNotice(next && { ...next, id: noticeId.current });
  }, []);
  const splitRef = useRef<HTMLDivElement>(null);
  // Open artifact tabs in the order opened, and the one shown (null: the log). Keyed per log.
  const [openTabs, setOpenTabs] = useState<readonly string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const openArtifact = useCallback((id: string): void => {
    setOpenTabs((tabs) => (tabs.includes(id) ? tabs : [...tabs, id]));
    setActiveTab(id);
    setMTab(MobileTab.Write);
    setSplitShut((shut) => (shut === SplitShut.Editor ? SplitShut.None : shut));
  }, []);
  // The right neighbour takes its place, else the left, else the log.
  const closeArtifact = (id: string): void => {
    const at = openTabs.indexOf(id);
    const rest = openTabs.filter((tab) => tab !== id);
    setOpenTabs(rest);
    if (activeTab === id) setActiveTab(rest[at] ?? rest[at - 1] ?? null);
  };

  // For History: set on a real selection, cleared when it collapses.
  useEffect(() => {
    const onSelection = (): void => {
      const { from, to } = editor.state.selection;
      if (to > from) setSelection({ from, to });
      else if (editor.isFocused) setSelection(null);
    };
    editor.on('selectionUpdate', onSelection);
    return () => {
      editor.off('selectionUpdate', onSelection);
    };
  }, [editor]);

  const showHistory = useCallback((range: ISelection | null): void => {
    if (isNotNil(range)) setSelection(range);
    setRightTab(RightTab.History);
    setMTab(MobileTab.History);
    setSplitShut(SplitShut.None);
  }, []);

  // "Show" from the toast or the activity.
  const flash = useCallback(
    (from: number, to: number): void => {
      changeMenu(Menu.None);
      const size = editor.state.doc.content.size;
      editor
        .chain()
        .setTextSelection({ from: clamp(from, 1, size), to: clamp(to, 1, size) })
        .scrollIntoView()
        .focus()
        .run();
    },
    [changeMenu, editor]
  );

  const dragSplit = (event: ReactPointerEvent<HTMLButtonElement>): void =>
    dragHandle(event, (move, stop) => {
      const box = splitRef.current?.getBoundingClientRect();
      if (isNil(box)) return;
      const left = move.clientX - box.left;
      const right = box.width - left;
      const shut =
        left < PANE_SHUT_BELOW ? SplitShut.Editor : right < PANE_SHUT_BELOW ? SplitShut.Side : null;
      if (isNotNil(shut)) {
        setSplitShut(shut);
        stop();
        return;
      }
      setSplit(clamp(left, PANE_FLOOR, box.width - PANE_FLOOR) / box.width);
    });

  const shared: ILogShared = {
    ...props,
    editor,
    meActor,
    resolve,
    settings,
    menu,
    setMenu: changeMenu,
    selection,
    setSelection,
    showHistory,
    flash,
    setNotice,
    openTabs,
    activeTab,
    openArtifact,
    closeArtifact,
    selectTab: setActiveTab,
    readOnly,
    learnWriters,
    awarenessStates: () => awareness.getStates(),
  };

  const overlays = (
    <>
      {menu === Menu.None ? null : (
        <button
          type="button"
          className={cn(
            'fixed inset-0 cursor-default border-0 bg-transparent',
            CARD_MENUS.has(menu) ? 'z-1' : 'z-40'
          )}
          aria-label="Close menu"
          onClick={() => changeMenu(Menu.None)}
        />
      )}
      {menu === Menu.Picker ? (
        <EntityGridPicker
          multiple={isNil(pickTarget)}
          onPick={(entities) => {
            const [first] = entities;
            if (isNil(pickTarget)) insertEntities(entities);
            else if (isNotNil(first)) pickTarget(first);
          }}
          onClose={() => changeMenu(Menu.None)}
        />
      ) : null}
      <ToastStack narrow={narrow}>
        <AgentToast
          feed={feed}
          settings={settings}
          me={me}
          onShow={(change) => flash(change.from, change.to)}
        />
        {isNil(notice) ? null : (
          <NoticeToast key={notice.id} notice={notice} onClose={() => setNotice(null)} />
        )}
      </ToastStack>
    </>
  );

  if (mode === ViewMode.Read)
    return (
      <>
        <ReadCard {...shared} />
        {overlays}
      </>
    );

  const editorShut = splitShut === SplitShut.Editor && !narrow;
  const sideShut = splitShut === SplitShut.Side && !narrow;
  const sideVisible = narrow ? mTab !== MobileTab.Write : !sideShut;
  const bothOpen = !editorShut && !sideShut && !narrow;

  return (
    <EntityPickerContext.Provider value={canEdit ? openEntityPicker : null}>
      <div
        ref={splitRef}
        className="flex min-w-0 flex-1 flex-row gap-0 data-[narrow=true]:flex-col data-[narrow=true]:gap-2"
        data-narrow={narrow}
      >
        {editorShut ? (
          <button
            type="button"
            className={cn(SHUT, 'mr-4')}
            aria-label="Open the editor"
            onClick={() => setSplitShut(SplitShut.None)}
          >
            <span className={SHUT_LABEL}>Editor</span>
          </button>
        ) : (
          <EditorCard
            {...shared}
            style={
              narrow
                ? mTab === MobileTab.Write
                  ? { flex: '1 1 0' }
                  : { flex: '0 0 auto' }
                : bothOpen
                  ? { flex: `0 0 calc(${split * 100}% - 8px)` }
                  : { flex: '1 1 0' }
            }
            mTab={mTab}
            setMTab={setMTab}
            sideOpen={sideVisible}
            rightTab={rightTab}
            canShut={bothOpen}
            onShut={() => setSplitShut(SplitShut.Editor)}
          />
        )}
        {bothOpen ? (
          // biome-ignore lint/a11y/useSemanticElements: resize handle; <hr> takes no pointer events
          <button
            type="button"
            className="group relative flex w-4 flex-none cursor-col-resize touch-none items-center justify-center border-0 bg-transparent p-0"
            // biome-ignore lint/a11y/useAriaPropsForRole: pointer-only handle, no value to announce
            role="separator"
            aria-label="Resize the editor and the side pane"
            onPointerDown={dragSplit}
          >
            <span className="h-11 w-[5px] rounded-full bg-neutral-2 transition-[background,height] duration-150 ease-[ease] group-hover:h-16 group-hover:bg-primary-4" />
          </button>
        ) : null}
        {sideVisible ? (
          <SidePane
            {...shared}
            tab={narrow ? RIGHT_TAB_OF_MOBILE[mTab] : rightTab}
            setTab={setRightTab}
            editorShut={editorShut}
            canShut={bothOpen}
            onShut={() => setSplitShut(SplitShut.Side)}
          />
        ) : sideShut ? (
          <button
            type="button"
            className={cn(SHUT, 'ml-4')}
            aria-label="Open the side pane"
            onClick={() => setSplitShut(SplitShut.None)}
          >
            <span className={SHUT_LABEL}>{TAB_NAMES[rightTab]}</span>
          </button>
        ) : null}
      </div>
      {overlays}
    </EntityPickerContext.Provider>
  );
}

export interface ILogShared extends ILogPageProps {
  readonly editor: Editor;
  readonly meActor: IActor;
  readonly resolve: (clientId: number) => IActor;
  readonly settings: INotifySettings;
  readonly menu: TMenu;
  readonly setMenu: (menu: TMenu) => void;
  readonly selection: ISelection | null;
  readonly setSelection: (selection: ISelection | null) => void;
  readonly showHistory: (range: ISelection | null) => void;
  readonly flash: (from: number, to: number) => void;
  readonly setNotice: (notice: INotice | null) => void;
  readonly openTabs: readonly string[];
  readonly activeTab: string | null;
  readonly openArtifact: (id: string) => void;
  readonly closeArtifact: (id: string) => void;
  readonly selectTab: (id: string | null) => void;
  readonly readOnly: TReadOnlyReason | null;
  readonly awarenessStates: () => Map<number, Record<string, unknown>>;
  readonly learnWriters: (clientIds: readonly number[]) => void;
}
