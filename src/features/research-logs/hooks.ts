'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { atom, useAtom, useAtomValue } from 'jotai';
import { useRouter } from 'next/navigation';

import {
  createResearchLog,
  deleteResearchLog,
  downloadResearchLogDocument,
  downloadResearchLogFile,
  getResearchLog,
  getResearchLogs,
  saveResearchLogDocument,
  updateResearchLog,
} from '@/api/entitycore/queries/research-log';
import { getResearchLogDocument } from '@/api/entitycore/types/entities/research-log';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type {
  TResearchLogCreate,
  TResearchLogUpdate,
} from '@/api/entitycore/types/entities/research-log';

const KEY = 'research-logs';

/** Which scopes the list shows: this project's logs, public ones, or both. */
export const researchLogScopeAtom = atom({ public: true, project: true });

/** Same rule as the Data table: with both on a click keeps one; a click on the lone one brings both back. */
export function useResearchLogScope() {
  const [scope, setScope] = useAtom(researchLogScopeAtom);
  const toggle = (key: 'public' | 'project') =>
    setScope(
      scope.public && scope.project
        ? { public: key === 'public', project: key === 'project' }
        : { public: true, project: true }
    );
  return { scope, toggle };
}

export function useResearchLogs(search: string) {
  const ctx = useWorkspace();
  const scope = useAtomValue(researchLogScopeAtom);
  return useQuery({
    select: (res) => ({
      ...res,
      data: res.data.filter(
        (log) =>
          (scope.project && log.authorized_project_id === ctx.projectId) ||
          (scope.public && log.authorized_public)
      ),
    }),
    queryKey: [KEY, 'list', ctx.virtualLabId, ctx.projectId, search],
    queryFn: () =>
      getResearchLogs({
        filters: { page_size: 100, ...(search ? { search } : {}) },
        context: ctx,
      }),
  });
}

export function useResearchLog(id: string) {
  const ctx = useWorkspace();
  return useQuery({
    queryKey: [KEY, 'one', id],
    queryFn: () => getResearchLog({ id, context: ctx }),
  });
}

/** The markdown text of a log; empty when no document has been uploaded yet. */
export function useResearchLogDocument(
  id: string,
  assets: Parameters<typeof getResearchLogDocument>[0]
) {
  const ctx = useWorkspace();
  const doc = getResearchLogDocument(assets);
  return useQuery({
    queryKey: [KEY, 'document', id, doc?.id ?? null],
    queryFn: ({ signal }) =>
      doc
        ? downloadResearchLogDocument({ logId: id, assetId: doc.id, context: ctx, signal })
        : Promise.resolve(''),
  });
}

/** The text of a markdown file kept in the log's files folder. */
export function useResearchLogFile(logId: string, filesAssetId: string | undefined, path: string) {
  const ctx = useWorkspace();
  return useQuery({
    queryKey: [KEY, 'file', logId, filesAssetId, path],
    enabled: !!filesAssetId,
    retry: false,
    queryFn: ({ signal }) =>
      downloadResearchLogFile({
        logId,
        filesAssetId: filesAssetId as string,
        path,
        context: ctx,
        signal,
      }),
  });
}

export function useCreateResearchLog() {
  const ctx = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: TResearchLogCreate & { markdown?: string }) => {
      const { markdown, ...body } = payload;
      const log = await createResearchLog({ payload: body, context: ctx });
      if (markdown) await saveResearchLogDocument({ logId: log.id, markdown, context: ctx });
      return log;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY, 'list'] }),
  });
}

export function useSaveResearchLog(id: string) {
  const ctx = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      meta?: TResearchLogUpdate;
      markdown?: string;
      previousAssetId?: string;
    }) => {
      if (args.markdown !== undefined) {
        await saveResearchLogDocument({
          logId: id,
          markdown: args.markdown,
          previousAssetId: args.previousAssetId,
          context: ctx,
        });
      }
      if (args.meta && Object.keys(args.meta).length > 0) {
        await updateResearchLog({ id, payload: args.meta, context: ctx });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteResearchLog() {
  const ctx = useWorkspace();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteResearchLog({ id, context: ctx }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

const NEW_LOG_TEMPLATE = `## Question

## Approach

## Results

## Next steps
`;

export function useResearchLogHref() {
  const { virtualLabId, projectId } = useWorkspace();
  return (id?: string) =>
    `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/reports${id ? `/${id}` : ''}`;
}

/** Creates an untitled log from the template and opens it in edit mode. */
export function useStartResearchLog() {
  const create = useCreateResearchLog();
  const router = useRouter();
  const href = useResearchLogHref();
  const { notification } = App.useApp();
  const start = async () => {
    try {
      const log = await create.mutateAsync({
        name: 'Untitled research log',
        description: '',
        markdown: NEW_LOG_TEMPLATE,
      });
      router.push(`${href(log.id)}?edit=1`);
    } catch (e) {
      notification.error({ message: 'Could not create the log', description: String(e) });
    }
  };
  return { start, isPending: create.isPending };
}
