import { HocuspocusProviderWebsocketComponent, HocuspocusRoom } from '@hocuspocus/provider-react';
import { isNil, isNotNil } from 'es-toolkit';
import { useEffect, useMemo, useState } from 'react';

import { PageKind } from '@/api/logbook/types';
import { collaborationUrl } from '@/api/logbook/utils';
import { pageToShow, usePages } from '@/features/logbook/api/pages';
import { accessToken } from '@/features/logbook/auth/session';
import { ChangeFeed } from '@/features/logbook/collaboration/changes';
import { acquireCopy, releaseCopy } from '@/features/logbook/collaboration/local-copy';
import { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import { RetryableRefusal } from '@/features/logbook/collaboration/rejoin';
import { PageSkeleton } from '@/features/logbook/elements/skeletons';
import { LogContext } from '@/features/logbook/log/context';
import { LogPage } from '@/features/logbook/log/LogPage';
import { navigate, pathOf } from '@/features/logbook/router';

import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';
import type { IPage } from '@/api/logbook/types';
import type { IMe, IProject } from '@/features/logbook/auth/session';
import type { TLayout } from '@/features/logbook/board/layout';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { TViewMode } from '@/features/logbook/log/view-mode';

export interface ILogViewProps {
  readonly me: IMe;
  readonly project: IProject;
  readonly logId: string;
  readonly pageId: string | null; // null: the main page
  readonly log: IResearchLog | null;
  readonly layout: TLayout;
  readonly mode: TViewMode;
  readonly onMode: (mode: TViewMode) => void;
  readonly onBack: () => void;
  readonly onOpenList: () => void;
}

// Local copy of the page; null while it loads.
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
  // A page deleted while shown stays, read-only, instead of the main page swapping in.
  const [last, setLast] = useState<IPage | null>(null);
  const deleted =
    isNotNil(last) &&
    last.id === props.pageId &&
    pages.isSuccess &&
    !list.some((page) => page.id === last.id);
  const page = deleted ? last : pageToShow(list, props.pageId);
  if (!deleted && isNotNil(page) && page !== last) setLast(page);
  const openPage = (target: IPage): void =>
    navigate(pathOf(project, logId, target.kind === PageKind.Main ? null : target.id));

  if (pages.isPending) return <PageSkeleton />;
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
  // A reader opening a log nobody has written in yet: no page.
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
  // Deleted while open: shown read-only from the local copy.
  readonly deleted: boolean;
  readonly onOpenPage: (page: IPage) => void;
}

function PageView(props: IPageViewProps) {
  const { project, logId, page } = props;
  const copy = useLocalCopy(page.id, props.me.userId);
  const [notices] = useState(() => new CollaborationNotices());
  const [feed] = useState(() => new ChangeFeed());
  // When this visit began: History lists the saved activity up to here.
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
  if (isNil(copy) || copy.document.isDestroyed) return <PageSkeleton />;

  return (
    <LogContext.Provider value={context}>
      {/* One socket per page; the component ignores later `url` changes, hence PageView's key. */}
      <HocuspocusProviderWebsocketComponent url={collaborationUrl(page.id)}>
        {/* No flushDelay on purpose: the server already batches, and a delay would slow every ack. */}
        <HocuspocusRoom
          name={page.id}
          document={copy.document}
          token={accessToken}
          onStateless={({ payload }) => notices.receive(payload)}
          onConnect={() => notices.connected()}
          // Server-side refusals (busy, unavailable) are retried in LogPage; client ones are final.
          onAuthenticationFailed={({ reason }) => {
            // A deleted page refuses a new join; it stays shown, read-only.
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
