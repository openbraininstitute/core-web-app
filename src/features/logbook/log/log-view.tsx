import { HocuspocusProviderWebsocketComponent, HocuspocusRoom } from '@hocuspocus/provider-react';
import { isNil, isNotNil } from 'es-toolkit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { PageKind } from '@/api/logbook/types';
import { collaborationUrl } from '@/api/logbook/utils';
import { getAuthSession } from '@/features/auth/session';
import { usePages } from '@/features/logbook/api/pages';
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
} from '@/features/logbook/log/open-tabs';
import { navigate, pathOf } from '@/features/logbook/router';
import { TabKind } from '@/features/logbook/types';

import type { IPage } from '@/api/logbook/types';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { ILogViewProps, IOpenTabs, IPageViewProps, ITabRef } from '@/features/logbook/types';

const sessionToken = async (): Promise<string> => (await getAuthSession())?.accessToken ?? '';

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
  const [held, setTabs] = useState<IOpenTabs>(NO_TABS);
  const tabs = settleTabs(held, list, props.pageId);
  if (tabs !== held) setTabs(tabs);
  const [shownId] = tabs.live;
  const listed = list.find((item) => item.id === shownId) ?? null;
  const [last, setLast] = useState<IPage | null>(null);
  if (isNotNil(listed) && listed !== last) setLast(listed);
  const deleted = isNil(listed) && isNotNil(last) && last.id === shownId;
  const page = listed ?? (deleted ? last : null);
  const cool = useCallback((pageId: string): void => setTabs((now) => coolPage(now, pageId)), []);

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
  if (pages.isError && isNil(pages.data))
    return (
      <section className={OPENING}>
        <h2 className="text-[22px] font-bold">This log cannot be opened</h2>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">
          {pages.error.message}
        </p>
        <button type="button" className="logbook-btn-navy" onClick={props.onBack}>
          All research logs
        </button>
      </section>
    );
  if (isNil(page))
    return (
      <section className={OPENING}>
        <h2 className="text-[22px] font-bold">Nothing written yet</h2>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">
          This log is empty. It opens here once someone writes in it.
        </p>
        <button type="button" className="logbook-btn-navy" onClick={props.onBack}>
          All research logs
        </button>
      </section>
    );
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

function PageView(props: IPageViewProps) {
  const { project, logId, page, shown, onCool } = props;
  const copy = useLocalCopy(page.id, props.me.userId);
  const [notices] = useState(() => new CollaborationNotices());
  const [feed] = useState(() => new ChangeFeed());
  const [openedAt] = useState(() => new Date().toISOString());
  const [authFailed, setAuthFailed] = useState<string | null>(null);
  const context = useMemo(() => ({ project, logId }), [project, logId]);
  useEffect(() => {
    if (isNotNil(authFailed) && !shown) onCool(page.id);
  }, [authFailed, shown, onCool, page.id]);

  if (isNotNil(authFailed))
    return (
      <section className={OPENING}>
        <h2 className="text-[22px] font-bold">This log cannot be opened</h2>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">{authFailed}</p>
        <button type="button" className="logbook-btn-navy" onClick={props.onBack}>
          All research logs
        </button>
      </section>
    );
  if (isNil(copy) || copy.document.isDestroyed) return <PageSkeleton />;

  return (
    <LogContext.Provider value={context}>
      {/* One socket per page; the component ignores later `url` changes, hence the key on PageView's wrapper. */}
      <HocuspocusProviderWebsocketComponent url={collaborationUrl(page.id)}>
        <HocuspocusRoom
          name={page.id}
          document={copy.document}
          token={sessionToken}
          onStateless={({ payload }) => notices.receive(payload)}
          onConnect={() => notices.connected()}
          onAuthenticationFailed={({ reason }) => {
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
