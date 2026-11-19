// The one route of the app, the same address the agents link to:
// /app/virtual-lab/<lab>/<project>/reports[/<log id>[/page/<page id>]]. No page id: the log's main
// page, so the agents' links stay as they are.

import { isNil } from 'es-toolkit';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import type { IProject } from '@/features/logbook/auth/session';

export interface IRoute {
  readonly project: IProject | null;
  readonly logId: string | null;
  readonly pageId: string | null; // a section; null: the main page
}

const ROUTE =
  /^\/app\/virtual-lab\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/reports(?:\/([0-9a-f-]{36})(?:\/page\/([0-9a-f-]{36}))?)?\/?$/;

export function routeOf(pathname: string): IRoute {
  const match = ROUTE.exec(pathname);
  if (isNil(match)) return { project: null, logId: null, pageId: null };
  return {
    project: { virtualLabId: match[1] ?? '', projectId: match[2] ?? '' },
    logId: match[3] ?? null,
    pageId: match[4] ?? null,
  };
}

export const pathOf = (
  project: IProject,
  logId: string | null = null,
  pageId: string | null = null
): string =>
  `/app/virtual-lab/${project.virtualLabId}/${project.projectId}/reports${isNil(logId) ? '' : `/${logId}${isNil(pageId) ? '' : `/page/${pageId}`}`}`;

// Next.js syncs usePathname with pushState and replaceState, so a change made here and one made by
// the app's own links or the back button both reach the logbook.
export function navigate(path: string, replace = false): void {
  if (path === location.pathname) return;
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
}

export function useRoute(): IRoute {
  const pathname = usePathname();
  return useMemo(() => routeOf(pathname), [pathname]);
}
