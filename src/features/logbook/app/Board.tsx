// The screen: with no log open, every log as a card grid (Home); with one open, the rail of logs and
// the log. Wide keeps the rail open, compact folds it to a bar, the phone shows the
// rail as a drawer.
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { clamp, isNil, isNotNil } from 'es-toolkit';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';

import { PageKind } from '@/api/logbook/types';
import {
  DEFAULT_ORDER,
  logsOf,
  noFilterOf,
  researchLogQuery,
  researchLogsQuery,
  useCreateLog,
  useDeleteLog,
  useUpdateLog,
} from '@/features/logbook/api/research-logs';
import { Home } from '@/features/logbook/app/Home';
import { Layout, useLayout } from '@/features/logbook/app/layout';
import { PageOutline } from '@/features/logbook/app/PageOutline';
import { Rail, RailHeading } from '@/features/logbook/app/Rail';
import { UnsentCopies } from '@/features/logbook/app/UnsentCopies';
import { cn } from '@/features/logbook/lib/utils';
import { markSeed } from '@/features/logbook/log/ui-state';
import { ViewMode } from '@/features/logbook/log/view-mode';
import { navigate, pathOf } from '@/features/logbook/router';
import { dragHandle } from '@/features/logbook/ui/drag';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { IPage } from '@/api/logbook/types';
import type { ILogOrder } from '@/features/logbook/api/research-logs';
import type { IMore, IScope } from '@/features/logbook/app/Rail';
import type { IMe, IProject } from '@/features/logbook/auth/session';
import type { TViewMode } from '@/features/logbook/log/view-mode';

// The editor (Tiptap, ProseMirror, Yjs: most of the code) loads when a log opens, so sign-in and
// the list come first; the chunk is fetched as soon as the list shows, before anyone clicks.
const loadLogView = () => import('@/features/logbook/log/LogView');
const LogView = lazy(() => loadLogView().then((m) => ({ default: m.LogView })));

// The list asks EntityCore again once typing pauses this long, not on every key.
const SEARCH_WAIT_MS = 250;

const RAIL_MAX = 364;
const RAIL_FLOOR = 220;
const RAIL_SHUT_BELOW = 110;

// A size container (@container/rail): the rail's header adapts to the rail's own width, which the
// person drags (220 to 364px), not to the window's.
const RAIL = '@container/rail flex min-h-0 flex-none flex-col gap-3 overflow-hidden p-3';
const EMPTY = 'logbook-card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center';

export interface IBoardProps {
  readonly me: IMe;
  readonly project: IProject;
  readonly logId: string | null;
  readonly pageId: string | null; // a section of the open log; null: its main page
}

export function Board({ me, project, logId, pageId }: IBoardProps) {
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const layout = useLayout(root);
  const narrow = layout === Layout.Narrow;

  const [scope, setScope] = useState<IScope>({ public: true, project: true });
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<ILogOrder>(DEFAULT_ORDER);
  const [searched, setSearched] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearched(search), SEARCH_WAIT_MS);
    return () => clearTimeout(timer);
  }, [search]);
  // A cleared search applies at once; only typing waits.
  const filter = { ...scope, order, search: search.trim() === '' ? '' : searched };
  const off = noFilterOf(filter);
  // A new search keeps the last list on screen until its answer comes: no flash of "Loading".
  const logs = useInfiniteQuery({
    ...researchLogsQuery(project, filter),
    placeholderData: keepPreviousData,
  });
  const listed = useMemo(() => (off ? [] : logsOf(logs.data?.pages ?? [])), [off, logs.data]);
  const total = off ? 0 : (logs.data?.pages[0]?.pagination.total_items ?? 0);
  // The end of the list came near: the next 10, one page at a time.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = logs;
  // Not while the list itself loads (a new search, filter or order shows the old list until its
  // first page comes): a next page asked then would be dropped, or be the old list's.
  const listLoading = logs.isFetching && !isFetchingNextPage;
  const more: IMore = {
    has: !off && hasNextPage && !listLoading,
    loading: isFetchingNextPage,
    failed: logs.isFetchNextPageError,
    onMore: () => {
      if (hasNextPage && !logs.isFetching) void fetchNextPage();
    },
  };
  const loading = !off && logs.isPending;
  // A failed next page keeps the pages shown (LoadMore offers to try again).
  const error = !off && logs.isError && isNil(logs.data) ? logs.error.message : null;
  useEffect(() => {
    if (logs.isSuccess) void loadLogView();
  }, [logs.isSuccess]);
  const create = useCreateLog(project);
  const update = useUpdateLog(project);
  const remove = useDeleteLog(project);
  // The open log: from the list when it shows it, else read on its own (a search hides it).
  const inList = listed.find((log) => log.id === logId);
  const opened = useQuery({
    ...researchLogQuery(project, logId ?? ''),
    enabled: isNotNil(logId) && isNil(inList),
  });
  const active = inList ?? opened.data ?? null;

  const [railW, setRailW] = useState(RAIL_MAX);
  const [railShut, setRailShut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<TViewMode>(ViewMode.Read);

  // Entering compact folds the rail; leaving it unfolds it. Entering or leaving the phone layout
  // closes the drawer.
  useEffect(() => {
    setRailShut(layout === Layout.Compact);
    setDrawerOpen(false);
  }, [layout]);

  const pick = (id: string): void => {
    if (id !== logId) setMode(ViewMode.Read);
    setDrawerOpen(false);
    navigate(pathOf(project, id));
  };

  // A page of the open log: its own address (the main page keeps the log's). A section just added
  // opens in the editor.
  const openPage = (page: IPage, edit = false): void => {
    if (edit) setMode(ViewMode.Edit);
    setDrawerOpen(false);
    navigate(pathOf(project, page.researchId, page.kind === PageKind.Main ? null : page.id));
  };

  const startNew = (): void =>
    create.mutate(
      { name: 'Untitled log', description: 'A new research log.' },
      {
        onSuccess: (log) => {
          markSeed(log.id);
          setScope((s) => ({ ...s, project: true }));
          setMode(ViewMode.Edit);
          setDrawerOpen(false);
          navigate(pathOf(project, log.id));
        },
      }
    );

  // Rail resize.
  const dragRail = (event: ReactPointerEvent<HTMLButtonElement>): void =>
    dragHandle(event, (move) => {
      const left = grid.current?.getBoundingClientRect().left ?? 0;
      const wanted = move.clientX - left - 8;
      if (wanted < RAIL_SHUT_BELOW) return setRailShut(true);
      setRailShut(false);
      setRailW(clamp(Math.round(wanted), RAIL_FLOOR, RAIL_MAX));
    });

  const rail = (
    <Rail
      logs={listed}
      more={more}
      loading={loading}
      error={error}
      activeId={logId}
      project={project}
      scope={scope}
      search={search}
      order={order}
      onOrder={setOrder}
      heading={narrow ? RailHeading.Drawer : RailHeading.None}
      creating={create.isPending}
      onScope={setScope}
      onSearch={setSearch}
      onPick={pick}
      onNew={startNew}
      onClose={() => setDrawerOpen(false)}
      outline={
        isNil(logId) ? null : (
          <PageOutline
            project={project}
            logId={logId}
            logName={active?.name ?? 'this log'}
            pageId={pageId}
            onOpen={openPage}
          />
        )
      }
      onRename={(id, name) => update.mutateAsync({ id, name })}
      onDelete={(id) =>
        remove.mutateAsync(id).then(() => {
          if (id === logId) navigate(pathOf(project), true);
        })
      }
    />
  );

  const back = (): void => {
    setMode(ViewMode.Read);
    navigate(pathOf(project));
  };

  return (
    <div
      ref={root}
      className="relative flex h-full flex-col overflow-hidden bg-background py-4 pr-4 pl-5 text-primary-9 data-[layout=narrow]:p-2"
      data-layout={layout}
    >
      <UnsentCopies userId={me.userId} enabled={logs.isSuccess} />
      <div ref={grid} className="flex min-h-0 flex-1 gap-4">
        {isNil(logId) ? (
          <main className="flex min-h-0 min-w-0 flex-1">
            <Home
              logs={listed}
              total={total}
              more={more}
              loading={loading}
              error={error}
              project={project}
              scope={scope}
              search={search}
              order={order}
              onOrder={setOrder}
              creating={create.isPending}
              onScope={setScope}
              onSearch={setSearch}
              onPick={pick}
              onNew={startNew}
            />
          </main>
        ) : (
          <>
            {narrow ? (
              <>
                {drawerOpen ? (
                  <button
                    type="button"
                    className="fixed inset-0 z-55 cursor-default border-0 bg-[rgba(0,16,38,0.32)]"
                    aria-label="Close the list of logs"
                    onClick={() => setDrawerOpen(false)}
                  />
                ) : null}
                <aside
                  className={cn(
                    RAIL,
                    'invisible fixed top-2 bottom-2 left-2 z-60 w-[min(360px,calc(100vw-40px))] translate-x-[calc(-100%-24px)] rounded-[24px] bg-white shadow-drawer transition-[translate,visibility] duration-[220ms] ease-[ease] data-[open=true]:visible data-[open=true]:translate-x-0'
                  )}
                  data-open={drawerOpen}
                  aria-label="Research logs"
                >
                  {rail}
                </aside>
              </>
            ) : railShut ? (
              <button
                type="button"
                className="logbook-card flex w-[42px] flex-none justify-center border-0 px-0 py-5 transition-[background-color] duration-150 ease-[ease] hover:bg-soft"
                aria-label="Open Reports"
                onClick={() => {
                  setRailShut(false);
                  setRailW((w) => Math.max(w, RAIL_FLOOR));
                }}
              >
                <span className="label-caps [writing-mode:vertical-rl]">Reports</span>
              </button>
            ) : (
              <aside
                className={cn('logbook-card', RAIL)}
                style={{ width: railW }}
                aria-label="Research logs"
              >
                {rail}
              </aside>
            )}
            <main className="relative flex min-h-0 min-w-0 flex-1">
              {layout === Layout.Wide && !railShut ? (
                // biome-ignore lint/a11y/useSemanticElements: a pointer-dragged resize handle; <hr> takes no pointer events
                <button
                  type="button"
                  className="group absolute top-0 bottom-0 left-[-16px] z-5 flex w-4 flex-none cursor-col-resize touch-none items-center justify-center border-0 bg-transparent p-0"
                  // biome-ignore lint/a11y/useAriaPropsForRole: pointer-only resize handle, it has no value to announce
                  role="separator"
                  aria-label="Resize the list of logs"
                  onPointerDown={dragRail}
                >
                  <span className="h-11 w-[5px] rounded-full bg-neutral-2 transition-[background-color,height] duration-150 ease-[ease] group-hover:h-16 group-hover:bg-primary-4" />
                </button>
              ) : null}
              <Suspense fallback={<section className={EMPTY} />}>
                {/*
                  The key is load-bearing: another log mounts a new LogView, so its page gets its
                  own collaboration socket (page affinity). The socket component ignores a new url.
                */}
                <LogView
                  key={logId}
                  me={me}
                  project={project}
                  logId={logId}
                  pageId={pageId}
                  log={active}
                  layout={layout}
                  mode={mode}
                  onMode={setMode}
                  onBack={back}
                  onOpenList={() => setDrawerOpen(true)}
                />
              </Suspense>
            </main>
          </>
        )}
      </div>
    </div>
  );
}
