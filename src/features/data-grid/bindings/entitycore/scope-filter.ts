import { FilterValueKind, GridActionType, OperatorId } from '@/features/data-grid/core';

import type { GridController } from '@/features/data-grid/core';

/** The scope column, whose filter holds a {@link TScopeSelectionKey}. */
export const SCOPE_COLUMN_ID = 'scope';

/** The kinds of row a scope listing holds. */
export const ScopeKind = {
  /** public data from other projects */
  Public: 'public',
  /** the project's private data */
  Project: 'project',
  /** the project's data, made public */
  Published: 'published',
} as const;

export type TScopeKind = (typeof ScopeKind)[keyof typeof ScopeKind];

/** Every kind, in the order the header shows them. */
export const SCOPE_KINDS: readonly TScopeKind[] = Object.values(ScopeKind);

/** Each kind's name, for labels and screen readers. */
export const SCOPE_LABELS: Record<TScopeKind, string> = {
  [ScopeKind.Public]: 'Public',
  [ScopeKind.Project]: 'Project',
  [ScopeKind.Published]: 'Project, made public',
};

type TScopeParams = Record<string, unknown>;

/**
 * The kinds a listing can show together. `key` is the stored filter value, its kinds in
 * {@link SCOPE_KINDS} order; `target` is its one request on the bare `authorized_public`,
 * `authorized_project_id` and `authorized_project_id__neq` params (`AuthorizedFilterMixin`).
 * A readable row is public or the project's, so a private row is only ever the project's
 * own; without a project nothing is the project's. Public with Project alone is absent: it
 * means NOT (public AND project = X), and these params combine with AND only.
 */
export const ScopeSelection = {
  /** every kind: no params, so every row the project may read */
  All: { key: 'public,project,published', target: (): TScopeParams => ({}) },
  /** public data from other projects */
  Public: {
    key: 'public',
    target: (projectId?: string): TScopeParams => ({
      authorized_public: 'true',
      ...(projectId && { authorized_project_id__neq: projectId }),
    }),
  },
  /** the project's private data */
  Private: { key: 'project', target: (): TScopeParams => ({ authorized_public: 'false' }) },
  /** the project's data, made public */
  Published: {
    key: 'published',
    target: (projectId?: string): TScopeParams => ({
      authorized_public: 'true',
      ...(projectId && { authorized_project_id: projectId }),
    }),
  },
  /** every public row, the project's own and others' */
  Global: { key: 'public,published', target: (): TScopeParams => ({ authorized_public: 'true' }) },
  /** every row of the project, private or made public */
  Own: {
    key: 'project,published',
    target: (projectId?: string): TScopeParams =>
      projectId ? { authorized_project_id: projectId } : { authorized_public: 'false' },
  },
} as const;

export type TScopeSelection = (typeof ScopeSelection)[keyof typeof ScopeSelection];
export type TScopeSelectionKey = TScopeSelection['key'];

const SELECTION_BY_KEY = new Map<string, TScopeSelection>(
  Object.values(ScopeSelection).map((selection) => [selection.key, selection])
);

/** The selection `kinds` make, or undefined for one no request can list. */
function selectionOf(kinds: readonly string[]): TScopeSelection | undefined {
  return SELECTION_BY_KEY.get(SCOPE_KINDS.filter((kind) => kinds.includes(kind)).join(','));
}

/** The selection a filter value shows: every kind for none, or for one no request can list. */
export function scopeSelectionFor(value: string | undefined): TScopeSelection {
  return (value && selectionOf(value.split(','))) || ScopeSelection.All;
}

export function isScopeShown(selection: TScopeSelection, kind: TScopeKind): boolean {
  return selection.key.split(',').includes(kind);
}

/** The selection after a click on `kind`, or undefined when no request could list it. */
export function toggledScope(
  selection: TScopeSelection,
  kind: TScopeKind
): TScopeSelection | undefined {
  const kinds = selection.key.split(',');
  return selectionOf(
    isScopeShown(selection, kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind]
  );
}

/** The request params for a scope filter value. */
export function scopeFilterParams(value: string | undefined, projectId?: string): TScopeParams {
  return scopeSelectionFor(value).target(projectId);
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
  if (!row.authorized_public) return ScopeKind.Project;
  return projectId && row.authorized_project_id === projectId
    ? ScopeKind.Published
    : ScopeKind.Public;
}

/** Filters the scope column to `selection`; every kind shown is stored as no filter at all. */
export function showScope<Row>(
  controller: GridController<Row>,
  columnId: string,
  selection: TScopeSelection
) {
  controller.store.dispatch({
    type: GridActionType.SetFilter,
    columnId,
    keepSelection: true,
    entry:
      selection === ScopeSelection.All
        ? null
        : {
            columnId,
            operator: OperatorId.Eq,
            value: { kind: FilterValueKind.Text, text: selection.key },
          },
  });
}
