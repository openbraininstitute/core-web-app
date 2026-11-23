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
import { match, P } from 'ts-pattern';

import { PageKind, ReadOnlyReason } from '@/api/logbook/types';
import { writersQuery } from '@/features/logbook/api/writers';
import { peerActor, personActor, resolveActor } from '@/features/logbook/collaboration/actors';
import { useCoolWhenAcked, usePauseWhenHidden } from '@/features/logbook/collaboration/idle';
import { useRejoin } from '@/features/logbook/collaboration/rejoin';
import { PANE_FLOOR, PANE_SHUT_BELOW } from '@/features/logbook/constants';
import { editorExtensions } from '@/features/logbook/editor/extensions';
import { insertAfterBlock } from '@/features/logbook/editor/insert';
import { dragHandle, Latest } from '@/features/logbook/helpers';
import { EntityPickerContext, useLivePage } from '@/features/logbook/log/context';
import { EditorCard } from '@/features/logbook/log/editor-card';
import { EntityGridPicker } from '@/features/logbook/log/entity-grid-picker';
import { useNotifySettings } from '@/features/logbook/log/notify-settings';
import { ReadCard } from '@/features/logbook/log/read-card';
import { SidePane } from '@/features/logbook/log/side-pane';
import { AgentToast, NoticeToast, ToastStack } from '@/features/logbook/log/toasts';
import { CARD_MENUS, takeSeed } from '@/features/logbook/log/ui-state';
import { Layout, Menu, MobileTab, RightTab, SplitShut, ViewMode } from '@/features/logbook/types';
import { cn } from '@/utils/css-class';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type {
  IActor,
  ILogPageProps,
  ILogShared,
  INotice,
  IPickedEntity,
  ISelection,
  TMenu,
  TMobileTab,
  TOpenEntityPicker,
  TRightTab,
  TSplitShut,
} from '@/features/logbook/types';

const SHUT =
  'logbook-card flex w-[42px] flex-none justify-center border-0 px-0 py-5 transition-[background] duration-150 ease-[ease] hover:bg-soft';
const SHUT_LABEL = 'label-caps [writing-mode:vertical-rl]';

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

export function LogPage(props: ILogPageProps) {
  const { me, log, layout, mode, notices, feed, logId, copy, shown, keepMs, onCool } = props;
  const pageId = props.page.id;
  const provider = useLivePage();
  usePauseWhenHidden(provider);
  const unsent = useCallback((): boolean => {
    const { readOnly } = notices.snapshot();
    return (
      (isNil(readOnly) || readOnly === ReadOnlyReason.UnsavedLimit) && provider.hasUnsyncedChanges
    );
  }, [notices, provider]);
  const cool = useCallback(() => onCool(pageId), [onCool, pageId]);
  useCoolWhenAcked(unsent, keepMs, cool);

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
  const [liveSettings] = useState(() => new Latest(settings));
  useLayoutEffect(() => liveSettings.set(settings), [liveSettings, settings]);

  const { awareness } = provider;
  if (isNil(awareness)) throw new Error('The live page has no awareness');
  useEffect(() => {
    if (!shown) awareness.setLocalStateField('cursor', null);
  }, [shown, awareness]);
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
            pageId,
            wanted.toSorted((a, b) => a - b)
          )
        )
        .then(({ items }) => {
          if (items.length === 0) return;
          setWritten((known) => {
            const next = new Map(known);
            for (const item of items) next.set(item.clientId, peerActor(item));
            return next;
          });
        })
        .catch(() => {
          for (const id of wanted) asked.current.delete(id);
        });
    },
    [queries, provider, props.project, pageId]
  );
  const resolve = useCallback(
    (clientId: number) =>
      clientId === provider.document.clientID
        ? meActor
        : resolveActor(clientId, {
            awareness,
            peers: () => notices.snapshot().peers,
            agents: () => notices.snapshot().agents,
            written: (id) => {
              const announced = notices.writerOf(id);
              return isNil(announced) ? written.get(id) : peerActor(announced);
            },
          }),
    [provider, awareness, notices, meActor, written]
  );
  const [liveResolve] = useState(() => new Latest(resolve));
  useLayoutEffect(() => liveResolve.set(resolve), [liveResolve, resolve]);

  const editor = useEditor(
    {
      extensions: editorExtensions({
        provider,
        me: meActor,
        feed,
        resolve: (clientId) => liveResolve.get()(clientId),
        caretName: (user) => {
          const peer = notices.snapshot().peers.find((p) => p.userId === user['userId']);
          return peer?.label ?? 'Someone';
        },
        highlights: () => liveSettings.get().highlights,
        ready: () => provider.isSynced,
      }),
      editable: mode === ViewMode.Edit,
      shouldRerenderOnTransaction: false,
      immediatelyRender: true,
    },
    [provider]
  );

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
  useRejoin(provider, notices);
  const rejoinAt = useSyncExternalStore(notices.subscribe, () => notices.snapshot().rejoinAt);
  const canEdit = mode === ViewMode.Edit && isNil(readOnly) && isNil(rejoinAt) && !props.deleted;
  useEffect(() => {
    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  const [menu, setMenu] = useState<TMenu>(Menu.None);
  const [pickTarget, setPickTarget] = useState<((entity: IPickedEntity) => void) | null>(null);
  const openEntityPicker = useCallback<TOpenEntityPicker>((onPick) => {
    setPickTarget(() => onPick);
    setMenu(Menu.Picker);
  }, []);
  const changeMenu = useCallback((next: TMenu): void => {
    setPickTarget(null);
    setMenu(next);
  }, []);
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
  const [notice, setShownNotice] = useState<(INotice & { readonly id: number }) | null>(null);
  const noticeId = useRef(0);
  const setNotice = useCallback((next: INotice | null): void => {
    noticeId.current += 1;
    setShownNotice(next && { ...next, id: noticeId.current });
  }, []);
  const splitRef = useRef<HTMLDivElement>(null);
  const { onOpenArtifact } = props;
  const openArtifact = useCallback(
    (id: string): void => {
      onOpenArtifact(id);
      setMTab(MobileTab.Write);
      setSplitShut((shut) => (shut === SplitShut.Editor ? SplitShut.None : shut));
    },
    [onOpenArtifact]
  );

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
      const shut = match({ left, right })
        .with({ left: P.number.lt(PANE_SHUT_BELOW) }, () => SplitShut.Editor)
        .with({ right: P.number.lt(PANE_SHUT_BELOW) }, () => SplitShut.Side)
        .otherwise(() => null);
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
    openArtifact,
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
        {sideVisible && shown ? (
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
