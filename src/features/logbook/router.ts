// /app/virtual-lab/<lab>/<project>/logbook[/<log id>[/page/<page id>]], the address agents link to.

import { isNil } from 'es-toolkit';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

import type { IProject, IRoute } from '@/features/logbook/types';

const ROUTE =
  /^\/app\/virtual-lab\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/logbook(?:\/([0-9a-f-]{36})(?:\/page\/([0-9a-f-]{36}))?)?\/?$/;

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
  `/app/virtual-lab/${project.virtualLabId}/${project.projectId}/logbook${isNil(logId) ? '' : `/${logId}${isNil(pageId) ? '' : `/page/${pageId}`}`}`;

// Next.js syncs usePathname with pushState, so app links and the back button reach us too.
export function navigate(path: string, replace = false): void {
  if (path === location.pathname) return;
  if (replace) history.replaceState(null, '', path);
  else history.pushState(null, '', path);
}

export function useRoute(): IRoute {
  const pathname = usePathname();
  return useMemo(() => routeOf(pathname), [pathname]);
}
