// The pages of a research log, from the logbook server: the main page first, then the sections in
// order. A writer's open makes the log's anchor and its main page on the server, so the browser
// never creates the main page itself; it adds, renames and deletes sections.
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';

import { ApiError } from '@/api/error';
import { createPage, deletePage, renamePage } from '@/api/logbook/queries/page';
import { getResearch } from '@/api/logbook/queries/research';
import { PageKind } from '@/api/logbook/types';

import type { IPage } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';

// The page to show: the one asked for when the log has it, else the main page; null when the log
// has no page yet (only a reader sees that: a log no writer opened).
export const pageToShow = (pages: readonly IPage[], wanted: string | null): IPage | null =>
  pages.find((page) => page.id === wanted) ??
  pages.find((page) => page.kind === PageKind.Main) ??
  null;

// The server lists them in order already; sorted again so a list patched here keeps the order.
const inOrder = (pages: readonly IPage[]): IPage[] =>
  pages.toSorted((a, b) => a.position - b.position);

async function pagesOf(researchId: string, project: IProject): Promise<IPage[]> {
  const research = await getResearch({ id: researchId, context: project });
  return inOrder(research.pages);
}

// Read again every 30 s while the log is open (and when the tab comes back): a section an agent
// or a colleague adds shows within that. One small read per open log per 30 s.
// Limit: up to 30 s late. Upgrade: a `pages` notice from the server to every room of the log.
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

// A new section. The key is made once per add, so a retry of the same add never makes two.
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

// A rename sends the version last read (If-Match): a page renamed in the meantime is refused (412)
// and the list is read again, so the next try starts from the newest title.
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

// Deletes a section for good (its text, history and its copy in EntityCore). A delete that does not
// answer is safe to send again: the server finishes what the first one began.
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
