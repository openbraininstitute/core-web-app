import z from 'zod';

import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';

import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import type { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/analysis-notebook-template';

const AnalysisNotebookTemplateSchema = z.object({
  name: z
    .string({ message: 'Experimental analysis notebook template name is required' })
    .nonempty({ message: 'Experimental analysis notebook template name is required' }),
  description: z
    .string({ message: 'Experimental analysis notebook template description is required' })
    .nonempty({
      message: 'Experimental analysis notebook template description is required',
    }),
  scale: z.string().optional(),
  exercise_id: z.string().optional(),
});

export type TAnalysisNotebookTemplateCreate = z.infer<typeof AnalysisNotebookTemplateSchema>;

/**
 * Creates a new Experimental Analysis Notebook Template entity
 */
export async function createAnalysisNotebookTemplate({
  context,
  payload,
}: {
  context?: WorkspaceContext | null;
  payload: TAnalysisNotebookTemplateCreate;
}) {
  const api = await entityCoreApi();
  return await api.post<INotebook>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: payload,
  });
}

/**
 * Uploads a single file asset and attaches it to an existing notebook template entity
 */
export async function uploadNotebookTemplateFile({
  context,
  entityId,
  file,
  contentType,
  assetLabel,
}: {
  context?: WorkspaceContext | null;
  entityId: string;
  file: File;
  contentType: AssetContentType;
  assetLabel: AssetLabel;
}) {
  const api = await entityCoreApi();
  const formData = new FormData();
  const typedFile = new File([file], file.name, { type: contentType });
  formData.append('file', typedFile, file.name);
  formData.append('label', assetLabel as string);

  return await api.post<unknown>(`${baseUri}/${entityId}/assets`, {
    headers: {
      accept: 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: formData,
  });
}
