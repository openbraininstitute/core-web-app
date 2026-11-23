import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';

import { ApiError } from '@/api/error';
import { createPage, deletePage, renamePage } from '@/api/logbook/queries/page';
import { getResearch } from '@/api/logbook/queries/research';
import { PageKind } from '@/api/logbook/types';
import { PAGES_REFRESH_MS } from '@/features/logbook/constants';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { IPage } from '@/api/logbook/types';
import type { INewSection, IProject } from '@/features/logbook/types';

export const pageToShow = (pages: readonly IPage[], wanted: string | null): IPage | null =>
  pages.find((page) => page.id === wanted) ??
  pages.find((page) => page.kind === PageKind.Main) ??
  null;

const inOrder = (pages: readonly IPage[]): IPage[] =>
  pages.toSorted((a, b) => a.position - b.position);

async function pagesOf(researchId: string, project: IProject): Promise<IPage[]> {
  const research = await getResearch({ id: researchId, context: project });
  return inOrder(research.pages);
}

export const pagesQuery = (researchId: string, project: IProject) =>
  queryOptions({
    queryKey: keyBuilderLogbook.pages(researchId),
    queryFn: () => pagesOf(researchId, project),
    refetchInterval: PAGES_REFRESH_MS,
    retry: (count, error) =>
      count < 2 && !(error instanceof ApiError && (error.cause?.status ?? 500) < 500),
  });

export const usePages = (researchId: string, project: IProject, enabled = true) =>
  useQuery({ ...pagesQuery(researchId, project), enabled });

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
      queries.setQueryData<IPage[]>(keyBuilderLogbook.pages(researchId), (pages) =>
        inOrder([...(pages ?? []).filter((p) => p.id !== page.id), page])
      ),
  });
}

export function useRenamePage(researchId: string, project: IProject) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ page, title }: { readonly page: IPage; readonly title: string }) =>
      renamePage({ pageId: page.id, context: project, version: page.version, title }),
    onSuccess: (page) =>
      queries.setQueryData<IPage[]>(keyBuilderLogbook.pages(researchId), (pages) =>
        isNil(pages) ? pages : pages.map((p) => (p.id === page.id ? page : p))
      ),
    onError: () => queries.invalidateQueries({ queryKey: keyBuilderLogbook.pages(researchId) }),
  });
}

export function useDeleteSection(researchId: string, project: IProject) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string) => deletePage({ pageId, context: project }),
    onSuccess: (_answer, pageId) =>
      queries.setQueryData<IPage[]>(keyBuilderLogbook.pages(researchId), (pages) =>
        isNil(pages) ? pages : pages.filter((p) => p.id !== pageId)
      ),
  });
}
