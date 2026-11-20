import { HocuspocusProviderWebsocketComponent, HocuspocusRoom } from '@hocuspocus/provider-react';
import { isNil, isNotNil } from 'es-toolkit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageKind } from '@/api/logbook/types';
import { collaborationUrl } from '@/api/logbook/utils';
import { usePages } from '@/features/logbook/api/pages';
import { accessToken } from '@/features/logbook/auth/session';
import { ChangeFeed } from '@/features/logbook/collaboration/changes';
import { acquireCopy, releaseCopy } from '@/features/logbook/collaboration/local-copy';
import { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import { RetryableRefusal } from '@/features/logbook/collaboration/rejoin';
import { PageSkeleton } from '@/features/logbook/elements/skeletons';
import { LogContext } from '@/features/logbook/log/context';
import { LogPage } from '@/features/logbook/log/log-page';
import {
  closeTab,
  coolPage,
  keepMsOf,
  NO_TABS,
  settleTabs,
  showArtifact,
  showPage,
  TabKind,
} from '@/features/logbook/log/open-tabs';
import { navigate, pathOf } from '@/features/logbook/router';

import type { IResearchLog } from '@/api/entitycore/types/entities/research-log';
import type { IPage } from '@/api/logbook/types';
import type { IMe, IProject } from '@/features/logbook/auth/session';
import type { TLayout } from '@/features/logbook/board/layout';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { IOpenTabs, ITabRef } from '@/features/logbook/log/open-tabs';
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
  // Tabs decide the page on screen; the address is followed when it changes (settleTabs).
  const [held, setTabs] = useState<IOpenTabs>(NO_TABS);
  const tabs = settleTabs(held, list, props.pageId);
  if (tabs !== held) setTabs(tabs);
  const [shownId] = tabs.live;
  const listed = list.find((item) => item.id === shownId) ?? null;
  // A page deleted while shown stays, read-only, instead of the main page swapping in.
  const [last, setLast] = useState<IPage | null>(null);
  if (isNotNil(listed) && listed !== last) setLast(listed);
  const deleted = isNil(listed) && isNotNil(last) && last.id === shownId;
  const page = listed ?? (deleted ? last : null);
  const cool = useCallback((pageId: string): void => setTabs((now) => coolPage(now, pageId)), []);

  // The address follows the page on screen.
  const show = (next: IOpenTabs): void => {
    setTabs(next);
    const target = list.find((item) => item.id === next.live[0]);
    if (isNotNil(target) && target.id !== shownId)
      navigate(pathOf(project, logId, target.kind === PageKind.Main ? null : target.id));
  };
  const openPage = (target: IPage): void => show(showPage(tabs, target));
  const openArtifact = (id: string): void => show(showArtifact(tabs, id));
  const selectTab = (tab: ITabRef): void => {
    const target = list.find((item) => item.id === tab.id);
    if (tab.kind === TabKind.Artifact) openArtifact(tab.id);
    else if (isNotNil(target)) openPage(target);
  };
  const main = list.find((item) => item.kind === PageKind.Main);
  const shutTab = (tab: ITabRef): void => {
    if (isNotNil(main)) show(closeTab(tabs, tab, main.id));
  };

  if (pages.isPending) return <PageSkeleton />;
  // A failed re-read keeps the pages already shown.
  if (pages.isError && isNil(pages.data))
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
  // Sorted by id, so showing another page never moves a mounted editor in the DOM.
  const views = tabs.live.toSorted().flatMap((id) => {
    const view = id === page.id ? page : list.find((item) => item.id === id);
    return isNil(view) ? [] : [view];
  });
  return views.map((view) => (
    <div key={view.id} className={view.id === page.id ? 'contents' : 'hidden'}>
      <PageView
        {...props}
        page={view}
        pages={list}
        deleted={deleted && view.id === page.id}
        shown={view.id === page.id}
        keepMs={keepMsOf(tabs, view)}
        onCool={cool}
        tabs={tabs.open}
        artifactId={tabs.artifactId}
        onOpenPage={openPage}
        onOpenArtifact={openArtifact}
        onSelectTab={selectTab}
        onCloseTab={shutTab}
      />
    </div>
  ));
}

export interface IPageViewProps extends ILogViewProps {
  readonly page: IPage;
  readonly pages: readonly IPage[];
  // Deleted while open: shown read-only from the local copy.
  readonly deleted: boolean;
  readonly shown: boolean; // on screen; false: mounted but hidden (warm)
  readonly keepMs: number | null; // how long it stays mounted off screen; null: on screen
  readonly onCool: (pageId: string) => void;
  readonly tabs: readonly ITabRef[];
  readonly artifactId: string | null; // the file shown over the page
  readonly onOpenPage: (page: IPage) => void;
  readonly onOpenArtifact: (id: string) => void;
  readonly onSelectTab: (tab: ITabRef) => void;
  readonly onCloseTab: (tab: ITabRef) => void;
}

function PageView(props: IPageViewProps) {
  const { project, logId, page, shown, onCool } = props;
  const copy = useLocalCopy(page.id, props.me.userId);
  const [notices] = useState(() => new CollaborationNotices());
  const [feed] = useState(() => new ChangeFeed());
  // When this visit began: History lists the saved activity up to here.
  const [openedAt] = useState(() => new Date().toISOString());
  const [authFailed, setAuthFailed] = useState<string | null>(null);
  const context = useMemo(() => ({ project, logId }), [project, logId]);
  // A refused page lets go once off screen, so coming back asks the server again.
  useEffect(() => {
    if (isNotNil(authFailed) && !shown) onCool(page.id);
  }, [authFailed, shown, onCool, page.id]);

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
      {/* One socket per page; the component ignores later `url` changes, hence the key on PageView's wrapper. */}
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
