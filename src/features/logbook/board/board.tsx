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
import { EntityDetail } from '@/features/logbook/board/entity-detail';
import { Home } from '@/features/logbook/board/home';
import { Layout, useLayout } from '@/features/logbook/board/layout';
import { PageOutline } from '@/features/logbook/board/page-outline';
import { Rail, RailHeading } from '@/features/logbook/board/rail';
import { UnsentCopies } from '@/features/logbook/board/unsent-copies';
import { PageSkeleton } from '@/features/logbook/elements/skeletons';
import { dragHandle } from '@/features/logbook/helpers';
import { EntityDetailContext } from '@/features/logbook/log/context';
import { markSeed } from '@/features/logbook/log/ui-state';
import { ViewMode } from '@/features/logbook/log/view-mode';
import { navigate, pathOf } from '@/features/logbook/router';
import { cn } from '@/utils/css-class';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { IPage } from '@/api/logbook/types';
import type { ILogOrder } from '@/features/logbook/api/research-logs';
import type { IMe, IProject } from '@/features/logbook/auth/session';
import type { IMore, IScope } from '@/features/logbook/board/rail';
import type { IEntityTarget } from '@/features/logbook/log/context';
import type { TViewMode } from '@/features/logbook/log/view-mode';

// The editor is most of the code: load it lazily, prefetched once the list shows.
const loadLogView = () => import('@/features/logbook/log/log-view');
const LogView = lazy(() => loadLogView().then((m) => ({ default: m.LogView })));

const SEARCH_WAIT_MS = 250;

const RAIL_MAX = 364;
const RAIL_FLOOR = 220;
const RAIL_SHUT_BELOW = 110;

// Container query: the rail header follows the rail's dragged width, not the window.
const RAIL = '@container/rail flex min-h-0 flex-none flex-col gap-3 overflow-hidden p-3';

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
  // Keep the last list on screen while a new search loads.
  const logs = useInfiniteQuery({
    ...researchLogsQuery(project, filter),
    placeholderData: keepPreviousData,
  });
  const listed = useMemo(() => (off ? [] : logsOf(logs.data?.pages ?? [])), [off, logs.data]);
  const total = off ? 0 : (logs.data?.pages[0]?.pagination.total_items ?? 0);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = logs;
  // No next page while the list itself reloads; it would be dropped or stale.
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
  // A failed next page keeps the pages already shown.
  const error = !off && logs.isError && isNil(logs.data) ? logs.error.message : null;
  useEffect(() => {
    if (logs.isSuccess) void loadLogView();
  }, [logs.isSuccess]);
  const create = useCreateLog(project);
  const update = useUpdateLog(project);
  const remove = useDeleteLog(project);
  // Read the open log on its own when a search hides it from the list.
  const inList = listed.find((log) => log.id === logId);
  const opened = useQuery({
    ...researchLogQuery(project, logId ?? ''),
    enabled: isNotNil(logId) && isNil(inList),
  });
  const active = inList ?? opened.data ?? null;

  const [railW, setRailW] = useState(RAIL_MAX);
  const [railShut, setRailShut] = useState(() => layout === Layout.Compact);
  // The entity open in the detail panel, tied to its log so switching logs closes it.
  const [detail, setDetail] = useState<(IEntityTarget & { readonly logId: string }) | null>(null);
  const [railHeldOpen, setRailHeldOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<TViewMode>(ViewMode.Read);

  // Fold the rail in compact; close the drawer when the phone layout comes or goes.
  const [seenLayout, setSeenLayout] = useState(layout);
  if (seenLayout !== layout) {
    setSeenLayout(layout);
    setRailShut(layout === Layout.Compact);
    setDrawerOpen(false);
  }

  const pick = (id: string): void => {
    if (id !== logId) setMode(ViewMode.Read);
    setDrawerOpen(false);
    navigate(pathOf(project, id));
  };

  // Each section gets its own address; a just-added one opens in the editor.
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

  const shownDetail = isNotNil(detail) && detail.logId === logId ? detail : null;
  // The panel needs room: the rail folds while it is open, unless the user unfolds it.
  const railFolded = railShut || (isNotNil(shownDetail) && layout === Layout.Wide && !railHeldOpen);
  const openDetail = (target: IEntityTarget): void => {
    if (isNotNil(logId)) setDetail({ ...target, logId });
  };
  const closeDetail = (): void => {
    setDetail(null);
    setRailHeldOpen(false);
  };

  return (
    <EntityDetailContext.Provider value={openDetail}>
      <div
        ref={root}
        className="relative flex h-full flex-col overflow-x-clip bg-background py-px pr-1 pl-3 text-primary-9 data-[layout=narrow]:px-2"
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
                    className={cn(RAIL, 'drawer fixed z-60 w-[min(360px,calc(100vw-40px))]')}
                    data-open={drawerOpen}
                    aria-label="Research logs"
                  >
                    {rail}
                  </aside>
                </>
              ) : railFolded ? (
                <button
                  type="button"
                  className="logbook-card flex w-[42px] flex-none justify-center border-0 px-0 py-5 transition-[background-color] duration-150 ease-[ease] hover:bg-soft"
                  aria-label="Open Reports"
                  onClick={() => {
                    setRailShut(false);
                    if (isNotNil(shownDetail)) setRailHeldOpen(true);
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
                {layout === Layout.Wide && !railFolded ? (
                  // biome-ignore lint/a11y/useSemanticElements: a pointer-dragged resize handle; <hr> takes no pointer events
                  <button
                    type="button"
                    className="group absolute top-0 bottom-0 -left-4 z-5 flex w-4 flex-none cursor-col-resize touch-none items-center justify-center border-0 bg-transparent p-0"
                    // biome-ignore lint/a11y/useAriaPropsForRole: pointer-only resize handle, it has no value to announce
                    role="separator"
                    aria-label="Resize the list of logs"
                    onPointerDown={dragRail}
                  >
                    <span className="h-11 w-[5px] rounded-full bg-neutral-2 transition-[background-color,height] duration-150 ease-[ease] group-hover:h-16 group-hover:bg-primary-4" />
                  </button>
                ) : null}
                <Suspense fallback={<PageSkeleton />}>
                  {/* The key matters: a new log needs a new LogView to get its own socket. */}
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
              {isNil(shownDetail) ? null : (
                <EntityDetail
                  target={shownDetail}
                  project={project}
                  narrow={narrow}
                  onClose={closeDetail}
                />
              )}
            </>
          )}
        </div>
      </div>
    </EntityDetailContext.Provider>
  );
}
