// The server makes the main page when a writer opens the log; the browser only manages sections.
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';

import { ApiError } from '@/api/error';
import { createPage, deletePage, renamePage } from '@/api/logbook/queries/page';
import { getResearch } from '@/api/logbook/queries/research';
import { PageKind } from '@/api/logbook/types';

import type { IPage } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';

// Null only for a log no writer has opened yet.
export const pageToShow = (pages: readonly IPage[], wanted: string | null): IPage | null =>
  pages.find((page) => page.id === wanted) ??
  pages.find((page) => page.kind === PageKind.Main) ??
  null;

// Re-sort so locally patched lists keep their order.
const inOrder = (pages: readonly IPage[]): IPage[] =>
  pages.toSorted((a, b) => a.position - b.position);

async function pagesOf(researchId: string, project: IProject): Promise<IPage[]> {
  const research = await getResearch({ id: researchId, context: project });
  return inOrder(research.pages);
}

// Re-read every 30 s so sections others add show up. Upgrade: a server `pages` notice.
export const PAGES_REFRESH_MS = 30_000;

const pagesKey = (researchId: string) => ['pages', researchId] as const;

export const pagesQuery = (researchId: string, project: IProject) =>
  queryOptions({
    queryKey: pagesKey(researchId),
    queryFn: () => pagesOf(researchId, project),
    refetchInterval: PAGES_REFRESH_MS,
    retry: (count, error) =>
      count < 2 && !(error instanceof ApiError && (error.cause?.status ?? 500) < 500),
  });

export const usePages = (researchId: string, project: IProject, enabled = true) =>
  useQuery({ ...pagesQuery(researchId, project), enabled });

// The key is made once per add, so a retry never makes two sections.
export interface INewSection {
  readonly title: string;
  readonly key: string;
}

export function useCreateSection(researchId: string, project: IProject) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ title, key }: INewSection) =>
      createPage({
        researchId,
        context: project,
        title,
        kind: PageKind.Section,
        idempotencyKey: key,
      }),
    onSuccess: (page) =>
      queries.setQueryData<IPage[]>(pagesKey(researchId), (pages) =>
        inOrder([...(pages ?? []).filter((p) => p.id !== page.id), page])
      ),
  });
}

// If-Match: a stale rename gets a 412, so re-read the list for the next try.
export function useRenamePage(researchId: string, project: IProject) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ page, title }: { readonly page: IPage; readonly title: string }) =>
      renamePage({ pageId: page.id, context: project, version: page.version, title }),
    onSuccess: (page) =>
      queries.setQueryData<IPage[]>(pagesKey(researchId), (pages) =>
        isNil(pages) ? pages : pages.map((p) => (p.id === page.id ? page : p))
      ),
    onError: () => queries.invalidateQueries({ queryKey: pagesKey(researchId) }),
  });
}

// Permanent; safe to resend if it didn't answer.
export function useDeleteSection(researchId: string, project: IProject) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePage({ pageId, context: project }),
    onSuccess: (_answer, pageId) =>
      queries.setQueryData<IPage[]>(pagesKey(researchId), (pages) =>
        isNil(pages) ? pages : pages.filter((p) => p.id !== pageId)
      ),
  });
}
