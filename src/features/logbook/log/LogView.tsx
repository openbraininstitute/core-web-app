// An open research log: its pages from the logbook server, and the one shown (the main page, or a
// section the address names). That page is loaded first from its copy on this device
// (local-copy.ts), then joined live as a Hocuspocus room on that same document, over the page's
// own socket (page affinity). Notices and changes of the page live in two small stores.
// - PageView is keyed by the page id: another page mounts a new view, so its socket, copy,
//   notices and feed start clean (one socket per page: page affinity).
// - A page deleted while it is open stays shown, read-only, until the person leaves it: what it
//   held is never pulled from under them (they are told why it no longer saves).
import { HocuspocusProviderWebsocketComponent, HocuspocusRoom } from '@hocuspocus/provider-react';
import { isNil, isNotNil } from 'es-toolkit';
import { useEffect, useMemo, useRef, useState } from 'react';

import { PageKind } from '@/api/logbook/types';
import { collaborationUrl } from '@/api/logbook/utils';
import { pageToShow, usePages } from '@/features/logbook/api/pages';
import { accessToken } from '@/features/logbook/auth/session';
import { ChangeFeed } from '@/features/logbook/collaboration/changes';
import { acquireCopy, releaseCopy } from '@/features/logbook/collaboration/local-copy';
import { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import { RetryableRefusal } from '@/features/logbook/collaboration/rejoin';
import { LogContext } from '@/features/logbook/log/context';
import { LogPage } from '@/features/logbook/log/LogPage';
import { navigate, pathOf } from '@/features/logbook/router';

import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';
import type { IPage } from '@/api/logbook/types';
import type { TLayout } from '@/features/logbook/app/layout';
import type { IMe, IProject } from '@/features/logbook/auth/session';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { TViewMode } from '@/features/logbook/log/view-mode';

export interface ILogViewProps {
  readonly me: IMe;
  readonly project: IProject;
  readonly logId: string;
  readonly pageId: string | null; // the section the address names; null: the main page
  readonly log: IResearchLog | null;
  readonly layout: TLayout;
  readonly mode: TViewMode;
  readonly onMode: (mode: TViewMode) => void;
  readonly onBack: () => void;
  readonly onOpenList: () => void;
}

// The page's copy on this device, loaded; null while it loads. Held while this view shows the page.
function useLocalCopy(pageId: string | undefined, userId: string): LocalCopy | null {
  const [copy, setCopy] = useState<LocalCopy | null>(null);
  useEffect(() => {
    if (isNil(pageId)) return;
    let shown = true;
    void acquireCopy(pageId, userId).then((loaded) => {
      if (shown) setCopy(loaded);
    });
    return () => {
      shown = false;
      setCopy(null);
      releaseCopy(pageId, userId);
    };
  }, [pageId, userId]);
  return copy;
}

const OPENING =
  'logbook-card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center';

export function LogView(props: ILogViewProps) {
  const { project, logId } = props;
  const pages = usePages(logId, project);
  const list = useMemo(() => pages.data ?? [], [pages.data]);
  // The last page shown: when it leaves the list (deleted) while the address still names it, it
  // stays shown, read-only, rather than the main page taking its place under the person's eyes.
  const lastShown = useRef<IPage | null>(null);
  const last = lastShown.current;
  const deleted =
    isNotNil(last) &&
    last.id === props.pageId &&
    pages.isSuccess &&
    !list.some((page) => page.id === last.id);
  const page = deleted ? last : pageToShow(list, props.pageId);
  useEffect(() => {
    if (!deleted && isNotNil(page)) lastShown.current = page;
  }, [deleted, page]);
  const openPage = (target: IPage): void =>
    navigate(pathOf(project, logId, target.kind === PageKind.Main ? null : target.id));

  if (pages.isPending)
    return (
      <section className={OPENING}>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">Opening the log…</p>
      </section>
    );
  if (pages.isError)
    return (
      <section className={OPENING}>
        <h2 className="text-[22px] font-bold">This log cannot be opened</h2>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">
          {pages.error.message}
        </p>
        <button type="button" className="btn-navy" onClick={props.onBack}>
          All research logs
        </button>
      </section>
    );
  // A reader opening a log no writer opened yet: it has no page.
  if (isNil(page))
    return (
      <section className={OPENING}>
        <h2 className="text-[22px] font-bold">Nothing written yet</h2>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">
          This log is empty. It opens here once someone writes in it.
        </p>
        <button type="button" className="btn-navy" onClick={props.onBack}>
          All research logs
        </button>
      </section>
    );
  return (
    <PageView
      key={page.id}
      {...props}
      page={page}
      pages={list}
      deleted={deleted}
      onOpenPage={openPage}
    />
  );
}

export interface IPageViewProps extends ILogViewProps {
  readonly page: IPage;
  readonly pages: readonly IPage[];
  // The page left the log while open: shown from this device, read-only.
  readonly deleted: boolean;
  readonly onOpenPage: (page: IPage) => void;
}

// One page of the log, live. Mounted per page id (the key above).
function PageView(props: IPageViewProps) {
  const { project, logId, page } = props;
  const copy = useLocalCopy(page.id, props.me.userId);
  const [notices] = useState(() => new CollaborationNotices());
  const [feed] = useState(() => new ChangeFeed());
  // When this visit began, as the feed starts: History lists the saved activity up to here.
  const [openedAt] = useState(() => new Date().toISOString());
  const [authFailed, setAuthFailed] = useState<string | null>(null);
  const context = useMemo(() => ({ project, logId }), [project, logId]);

  if (isNotNil(authFailed))
    return (
      <section className={OPENING}>
        <h2 className="text-[22px] font-bold">This log cannot be opened</h2>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">{authFailed}</p>
        <button type="button" className="btn-navy" onClick={props.onBack}>
          All research logs
        </button>
      </section>
    );
  if (isNil(copy) || copy.document.isDestroyed)
    return (
      <section className={OPENING}>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">Opening the log…</p>
      </section>
    );

  return (
    <LogContext.Provider value={context}>
      {/*
        One socket per page, on the page's path (page affinity): the router in
        front of the server sends every person of a page to the same task.
        - The library component makes the socket once per mount and destroys it a tick after the
          unmount, so React's dev double mount keeps one socket.
        - It ignores a later change of `url`: PageView is keyed by page id (and LogView by log
          id), so another page mounts a new view and a new socket. A tab shows one page, so it
          is still one socket.
        - A switch closes the old socket: the provider sends what is pending first, and what is
          not sent stays in the copy on this device (local-sync.ts sends it at the next open).
      */}
      <HocuspocusProviderWebsocketComponent url={collaborationUrl(page.id)}>
        {/*
          No flushDelay here, on purpose: this tab sends each change and caret at once.
          - The server already batches what it sends on (COLLABORATION_BROADCAST_DELAY_MS): at most one
            caret per person per window reaches the other tabs, however fast a drag or a held
            key fires.
          - A window here would save only this tab's inbound frame and Redis publish per caret:
            under 1 % of task CPU in the load model.
          - Its price: up to the window more on every change, every ack and every "unsaved" in
            SaveStatus, because the provider batches changes and carets in one window.
        */}
        <HocuspocusRoom
          name={page.id}
          document={copy.document}
          token={accessToken}
          onStateless={({ payload }) => notices.receive(payload)}
          onConnect={() => notices.connected()}
          // A refusal of the server's own (busy, unavailable) is tried again (rejoin.ts, in
          // LogPage); only the client's own (not found, no access, bad sign-in) is final.
          onAuthenticationFailed={({ reason }) => {
            // A deleted page refuses a new join (not found): it stays shown, read-only.
            if (!RetryableRefusal.has(reason) && !props.deleted)
              setAuthFailed(`The live page refused this sign-in (${reason}).`);
          }}
        >
          <LogPage {...props} notices={notices} feed={feed} copy={copy} openedAt={openedAt} />
        </HocuspocusRoom>
      </HocuspocusProviderWebsocketComponent>
    </LogContext.Provider>
  );
}
