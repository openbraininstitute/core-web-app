import { FilterValueKind, GridActionType, OperatorId } from '@/features/data-grid/core';

import type { GridController } from '@/features/data-grid/core';

/** The scope column, whose filter holds one {@link TScopeKind}. */
export const SCOPE_COLUMN_ID = 'scope';

/** Public data from other projects, the project's private data, or the project's made public. */
export type TScopeKind = 'public' | 'project' | 'published';
/** Every kind, in the order the header shows them. */
export const SCOPE_KINDS: TScopeKind[] = ['public', 'project', 'published'];
/** The kind a listing shows while its scope filter holds none: one kind is always shown. */
export const DEFAULT_SCOPE_KIND: TScopeKind = 'public';

/** Each kind's name, for labels and screen readers. */
export const SCOPE_LABELS: Record<TScopeKind, string> = {
  public: 'Public',
  project: 'Project',
  published: 'Project, made public',
};

/**
 * Each kind as one request: `authorized_public`, `authorized_project_id` and
 * `authorized_project_id__neq` are bare params on every entity endpoint
 * (`AuthorizedFilterMixin`), and a private row is only ever the project's own. Without a
 * project nothing is the project's, so public data is all of it.
 */
const SCOPE_PARAMS: Record<TScopeKind, (projectId?: string) => Record<string, unknown>> = {
  public: (projectId) => ({
    authorized_public: 'true',
    ...(projectId && { authorized_project_id__neq: projectId }),
  }),
  project: () => ({ authorized_public: 'false' }),
  published: (projectId) => ({
    authorized_public: 'true',
    ...(projectId && { authorized_project_id: projectId }),
  }),
};

export function isScopeKind(value: string | undefined): value is TScopeKind {
  return SCOPE_KINDS.includes(value as TScopeKind);
}

/** The kind a filter value shows: the default for none, or for one saved by an older format. */
export function scopeKindFor(value: string | undefined): TScopeKind {
  return isScopeKind(value) ? value : DEFAULT_SCOPE_KIND;
}

/** The request params for a scope filter value. */
export function scopeFilterParams(value: string | undefined, projectId?: string) {
  return SCOPE_PARAMS[scopeKindFor(value)](projectId);
}

/** The fields a row's scope is read from. */
export interface IScopeRow {
  authorized_public?: boolean | null;
  authorized_project_id?: string | null;
  /** false on a hierarchy row shown only for its matching children */
  isFiltered?: boolean;
}

/** Which kind a row is: only the project's own records come back private. */
export function scopeKindOf(row: IScopeRow, projectId?: string): TScopeKind | null {
  if (typeof row.authorized_public !== 'boolean') return null;
  if (!row.authorized_public) return 'project';
  return projectId && row.authorized_project_id === projectId ? 'published' : 'public';
}

/** Filters the scope column to `kind`; the default kind is stored as no filter at all. */
export function showScope<Row>(
  controller: GridController<Row>,
  columnId: string,
  kind: TScopeKind
) {
  controller.store.dispatch({
    type: GridActionType.SetFilter,
    columnId,
    keepSelection: true,
    entry:
      kind === DEFAULT_SCOPE_KIND
        ? null
        : { columnId, operator: OperatorId.Eq, value: { kind: FilterValueKind.Text, text: kind } },
  });
}
