import z from 'zod';
import type { INotebook } from '@/api/entitycore/types/entities/notebook';
import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
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
});

export type TAnalysisNotebookTemplateCreate = z.infer<typeof AnalysisNotebookTemplateSchema>;

export type TAssetLabel = 'jupyter_notebook' | 'requirements' | 'notebook_required_files';
export type TContentType =
  | 'application/x-ipynb+json'
  | 'text/plain'
  | 'application/zip';

export const AssetLabel = {
  jupyter_notebook: 'jupyter_notebook' as TAssetLabel,
  requirements: 'requirements' as TAssetLabel,
  notebook_required_files: 'notebook_required_files' as TAssetLabel,
};

export const ContentType = {
  application_x_ipynb_json: 'application/x-ipynb+json' as TContentType,
  text_plain: 'text/plain' as TContentType,
  application_zip: 'application/zip' as TContentType,
};

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
  contentType: TContentType;
  assetLabel: TAssetLabel;
}) {
  const api = await entityCoreApi();
  const formData = new FormData();
  const typedFile = new File([file], file.name, { type: contentType });
  formData.append('file', typedFile, file.name);
  formData.append('label', assetLabel);

  return await api.post<unknown>(`${baseUri}/${entityId}/assets`, {
    headers: {
      accept: 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: formData,
  });
}
