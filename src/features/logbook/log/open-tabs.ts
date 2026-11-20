// The editor's open tabs as plain data: which tabs are open, which page is on screen, which file
// sits over it, and which pages stay mounted. Pure functions, so every rule is testable alone;
// each returns the same object when nothing changes, so React skips the render.
import { isNil, isNotNil } from 'es-toolkit';

import { PageKind } from '@/api/logbook/types';

import type { IPage, TValueOf } from '@/api/logbook/types';

export const TabKind = { Page: 'page', Artifact: 'artifact' } as const;
export type TTabKind = TValueOf<typeof TabKind>;

export interface ITabRef {
  readonly kind: TTabKind;
  readonly id: string;
}

export interface IOpenTabs {
  /** Tabs in strip order. The main page has no tab: it is always there. */
  readonly open: readonly ITabRef[];
  /** Mounted pages, the one on screen first, then the most recently left. */
  readonly live: readonly string[];
  /** The file shown over the page on screen, if any. */
  readonly artifactId: string | null;
  /** The address last acted on, and whether the log had its page; null before the first one. */
  readonly followed: { readonly pageId: string | null; readonly found: boolean } | null;
}

export const NO_TABS: IOpenTabs = { open: [], live: [], artifactId: null, followed: null };

/** Pages left recently stay mounted, so going back is instant. */
export const WARM_PAGES = 2;
/** How long a warm page keeps its editor and socket before they are freed. */
export const WARM_KEEP_MS = 60_000;

export const tabKey = (tab: ITabRef): string => `${tab.kind}:${tab.id}`;

const sameTab = (a: ITabRef, b: ITabRef): boolean => a.kind === b.kind && a.id === b.id;
const isOpen = (tabs: IOpenTabs, tab: ITabRef): boolean => tabs.open.some((t) => sameTab(t, tab));
const withTab = (tabs: IOpenTabs, tab: ITabRef): readonly ITabRef[] =>
  isOpen(tabs, tab) ? tabs.open : [...tabs.open, tab];

/** Puts a page on screen (its tab already open, or the main page) and the file away. */
function front(tabs: IOpenTabs, pageId: string, open = tabs.open): IOpenTabs {
  if (tabs.live[0] === pageId && isNil(tabs.artifactId) && open === tabs.open) return tabs;
  return {
    ...tabs,
    open,
    live: [pageId, ...tabs.live.filter((id) => id !== pageId)],
    artifactId: null,
  };
}

export function showPage(tabs: IOpenTabs, page: IPage): IOpenTabs {
  const open =
    page.kind === PageKind.Main ? tabs.open : withTab(tabs, { kind: TabKind.Page, id: page.id });
  return front(tabs, page.id, open);
}

export function showArtifact(tabs: IOpenTabs, artifactId: string): IOpenTabs {
  const open = withTab(tabs, { kind: TabKind.Artifact, id: artifactId });
  if (tabs.artifactId === artifactId && open === tabs.open) return tabs;
  return { ...tabs, open, artifactId };
}

/**
 * Follows the address once per change: its page shows, or the main page when the log lacks it
 * (shown later if the list gains it). Pages gone from the log lose their tab and view, except
 * the one on screen.
 */
export function settleTabs(
  tabs: IOpenTabs,
  pages: readonly IPage[],
  pageId: string | null
): IOpenTabs {
  const main = pages.find((page) => page.kind === PageKind.Main) ?? pages[0];
  if (isNil(main)) return tabs;
  const named = isNil(pageId) ? main : pages.find((page) => page.id === pageId);
  const seen = tabs.followed;
  const moved = isNil(seen) || seen.pageId !== pageId;
  const arrived = isNotNil(seen) && !seen.found && isNotNil(named);
  let next = tabs;
  if (moved || arrived) {
    const page = named ?? main;
    if (next.live[0] !== page.id) next = showPage(next, page);
    next = { ...next, followed: { pageId, found: isNotNil(named) } };
  }
  const known = new Set(pages.map((page) => page.id));
  const keep = (id: string): boolean => known.has(id) || id === next.live[0];
  const live = next.live.filter(keep);
  const open = next.open.filter((tab) => tab.kind === TabKind.Artifact || keep(tab.id));
  if (live.length === next.live.length && open.length === next.open.length) return next;
  return { ...next, live, open };
}

/** Closes a tab; when it was on screen, its right neighbour shows, else its left one. */
export function closeTab(tabs: IOpenTabs, tab: ITabRef, mainId: string): IOpenTabs {
  const at = tabs.open.findIndex((t) => sameTab(t, tab));
  if (at < 0) return tabs;
  const open = tabs.open.filter((_, index) => index !== at);
  const onScreen =
    tab.kind === TabKind.Artifact
      ? tabs.artifactId === tab.id
      : tabs.live[0] === tab.id && isNil(tabs.artifactId);
  const underFile = tab.kind === TabKind.Page && tabs.live[0] === tab.id;
  if (!onScreen && !underFile) return { ...tabs, open };
  // The page that goes under a file: the nearest page tab to the left, else the main page.
  const leftPage = open.slice(0, at).findLast((t) => t.kind === TabKind.Page)?.id ?? mainId;
  if (!onScreen) {
    const shown = front(tabs, leftPage, open);
    return { ...shown, artifactId: tabs.artifactId };
  }
  const neighbour = open[at] ?? open[at - 1];
  if (isNil(neighbour)) {
    return tab.kind === TabKind.Artifact
      ? { ...tabs, open, artifactId: null }
      : front(tabs, mainId, open);
  }
  if (neighbour.kind === TabKind.Page) return front(tabs, neighbour.id, open);
  const under = tab.kind === TabKind.Page ? front(tabs, leftPage, open) : { ...tabs, open };
  return { ...under, artifactId: neighbour.id };
}

/**
 * How long a page stays mounted once off screen: null while on screen, WARM_KEEP_MS for the
 * last WARM_PAGES left (if their tab is still open), else 0.
 */
export function keepMsOf(tabs: IOpenTabs, page: IPage): number | null {
  const at = tabs.live.indexOf(page.id);
  if (at === 0) return null;
  const tabOpen = page.kind === PageKind.Main || isOpen(tabs, { kind: TabKind.Page, id: page.id });
  return at > 0 && at <= WARM_PAGES && tabOpen ? WARM_KEEP_MS : 0;
}

/** Lets a warm page go; the page on screen is never let go. */
export function coolPage(tabs: IOpenTabs, pageId: string): IOpenTabs {
  const at = tabs.live.indexOf(pageId);
  if (at <= 0) return tabs;
  return { ...tabs, live: tabs.live.filter((id) => id !== pageId) };
}
