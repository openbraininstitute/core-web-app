import { entityCoreApi, getEntityCoreContext } from '@/api/entitycore/utils';
import { compactRecord } from '@/utils/dictionary';

import type { ISubjectFilter, TSubjectCreate } from '@/api/entitycore/types/shared/subject';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { ISubject } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';

const baseUri = '/subject';

/**
 * Retrieves subjects from the Entity Core API.
 *
 * @param filters - Optional filters to apply to the subject query.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the subjects.
 */
export async function getSubjects({
  filters,
  context,
}: {
  filters?: Partial<ISubjectFilter>;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ISubject>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISubject>>(baseUri, {
    queryParams: compactRecord({
      ...filters,
    }),
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Retrieves a subject from the Entity Core API.
 *
 * @param id - The ID of the subject to retrieve.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the subject.
 */
export async function getSubject({
  id,
  context,
}: {
  id: string;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ISubject>> {
  const api = await entityCoreApi();
  return await api.get<EntityCoreResponse<ISubject>>(`${baseUri}/${id}`, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
  });
}

/**
 * Creates a subject in the Entity Core API.
 *
 * @param subject - The subject to create.
 * @param context - Optional workspace context for the API call.
 * @returns A promise resolving to the EntityCore response containing the created subject.
 */
export async function createSubject({
  subject,
  context,
}: {
  subject: TSubjectCreate;
  context?: WorkspaceContext | null;
}): Promise<EntityCoreResponse<ISubject>> {
  const api = await entityCoreApi();
  return await api.post<EntityCoreResponse<ISubject>>(baseUri, {
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...getEntityCoreContext(context).headers,
    },
    body: subject,
  });
}
