import { FilterValueKind, GridActionType, OperatorId } from '@/features/data-grid/core';

import type { GridController, IRowGroup } from '@/features/data-grid/core';

/**
 * What the scope filter can show, short of everything. The API filters on
 * `authorized_public` and `authorized_project_id` (equality only), so public data from
 * elsewhere is public data less the project's made-public data, which the data source
 * passes over itself.
 */
export const ScopeFilter = {
  /** all public data, the project's made-public data included */
  Public: 'public',
  /** public data from elsewhere, the project's made-public data left out */
  PublicOnly: 'public-only',
  /** public data from the project, which is its made-public data seen from public data */
  PublicFromProject: 'public-from-project',
  /** everything in the project, public or not */
  Project: 'project',
  /** the project's data that was made public */
  Published: 'published',
  /** the project's data that is not public */
  Private: 'private',
} as const;
export type TScopeFilter = (typeof ScopeFilter)[keyof typeof ScopeFilter];

const SCOPE_PARAMS: Record<TScopeFilter, (projectId?: string) => Record<string, unknown>> = {
  [ScopeFilter.Public]: () => ({ authorized_public: 'true' }),
  [ScopeFilter.PublicOnly]: () => ({ authorized_public: 'true' }),
  [ScopeFilter.PublicFromProject]: (projectId) => SCOPE_PARAMS[ScopeFilter.Published](projectId),
  [ScopeFilter.Project]: (projectId) => (projectId ? { authorized_project_id: projectId } : {}),
  [ScopeFilter.Published]: (projectId) => ({
    authorized_public: 'true',
    ...(projectId && { authorized_project_id: projectId }),
  }),
  [ScopeFilter.Private]: () => ({ authorized_public: 'false' }),
};

export function isScopeFilter(value: string): value is TScopeFilter {
  return value in SCOPE_PARAMS;
}

/** The request params for a scope filter value; an unknown one filters nothing. */
export function scopeFilterParams(value: string, projectId?: string): Record<string, unknown> {
  return isScopeFilter(value) ? SCOPE_PARAMS[value](projectId) : {};
}

/** The rows a scope filter value leaves out that no param can: the made-public data. */
export function scopeFilterExcept(value: string, projectId?: string) {
  return value === ScopeFilter.PublicOnly && projectId
    ? SCOPE_PARAMS[ScopeFilter.Published](projectId)
    : undefined;
}

/** The scope column, whose filter holds these values. */
export const SCOPE_COLUMN_ID = 'scope';

/** Public data from elsewhere, the project's private data, or the project's made public. */
export type TScopeKind = 'public' | 'project' | 'published';
export const SCOPE_KINDS: TScopeKind[] = ['public', 'project', 'published'];

export function isScopeKind(value: string | undefined): value is TScopeKind {
  return SCOPE_KINDS.includes(value as TScopeKind);
}

/**
 * The scope column's orders, each named by the kind it lists first and cycled through in
 * this order: public data from elsewhere, the project's private data, its made-public data.
 */
export const SCOPE_SORT_ORDERS: TScopeKind[] = ['public', 'project', 'published'];

/**
 * The groups each order lists: its kind, then every other row. Without a project nothing
 * is the project's, so public data simply comes before the rest.
 */
export function scopeSortGroups(kind: TScopeKind, projectId?: string): IRowGroup[] | null {
  const publicData = SCOPE_PARAMS[ScopeFilter.Public]();
  const privateData = SCOPE_PARAMS[ScopeFilter.Private]();
  if (kind === 'project') return [{ filter: privateData }, { filter: publicData }];
  if (!projectId) {
    return kind === 'public' ? [{ filter: publicData }, { filter: privateData }] : null;
  }
  const published = SCOPE_PARAMS[ScopeFilter.Published](projectId);
  if (kind === 'public') {
    return [
      { filter: publicData, except: published },
      { filter: SCOPE_PARAMS[ScopeFilter.Project](projectId) },
    ];
  }
  return [{ filter: published }, { filter: {}, except: published }];
}

/**
 * The kinds of row each filter value shows; no filter shows all three. Where two values
 * show the same, the first is the one the toggles set.
 */
const SHOWN: Record<TScopeFilter, TScopeKind[]> = {
  [ScopeFilter.Public]: ['public', 'published'],
  [ScopeFilter.PublicOnly]: ['public'],
  [ScopeFilter.Project]: ['project', 'published'],
  [ScopeFilter.Published]: ['published'],
  [ScopeFilter.PublicFromProject]: ['published'],
  [ScopeFilter.Private]: ['project'],
};

/**
 * Which mark a filter value keeps on (none for both), and which of its rows: those
 * bearing that mark alone, and those bearing both, the project's made-public data.
 */
export interface IScopeView {
  side: 'public' | 'project' | null;
  single: boolean;
  joint: boolean;
}

const VIEWS: Record<TScopeFilter, IScopeView> = {
  [ScopeFilter.Public]: { side: 'public', single: true, joint: true },
  [ScopeFilter.PublicOnly]: { side: 'public', single: true, joint: false },
  [ScopeFilter.PublicFromProject]: { side: 'public', single: false, joint: true },
  [ScopeFilter.Project]: { side: 'project', single: true, joint: true },
  [ScopeFilter.Private]: { side: 'project', single: true, joint: false },
  [ScopeFilter.Published]: { side: 'project', single: false, joint: true },
};

/** The view a filter value gives, both marks on for none (or an unknown one). */
export function scopeView(value: string | undefined): IScopeView {
  return value && isScopeFilter(value) ? VIEWS[value] : { side: null, single: true, joint: true };
}

/** The filter value giving a view; null for both marks on. */
export function viewFilter({ side, single, joint }: IScopeView): TScopeFilter | null {
  const match = Object.entries(VIEWS).find(
    ([, view]) => view.side === side && view.single === single && view.joint === joint
  );
  return (match?.[0] as TScopeFilter | undefined) ?? null;
}

/** The kinds a filter value shows, all three for none (or an unknown one). */
export function shownBy(value: string | undefined): Set<TScopeKind> {
  return new Set(value && isScopeFilter(value) ? SHOWN[value] : SCOPE_KINDS);
}

/** The filter value that shows exactly `kinds`; null for all of them. */
export function filterShowing(kinds: Set<TScopeKind>): TScopeFilter | null {
  if (kinds.size === SCOPE_KINDS.length) return null;
  const match = Object.entries(SHOWN).find(
    ([, shows]) => shows.length === kinds.size && shows.every((kind) => kinds.has(kind))
  );
  return (match?.[0] as TScopeFilter | undefined) ?? null;
}

/**
 * What switching `kind` would show, or null when it cannot be switched: the last one on
 * stays on, and the project's made-public data stays on while public data is, being
 * public too.
 */
export function toggled(shown: Set<TScopeKind>, kind: TScopeKind): Set<TScopeKind> | null {
  const next = new Set(shown);
  if (!next.has(kind)) {
    next.add(kind);
    if (kind === 'public') next.add('published');
    return next;
  }
  if (kind === 'published' && next.has('public')) return null;
  next.delete(kind);
  return next.size ? next : null;
}

/** Filters the scope column to show exactly `kinds`. */
export function showScope<Row>(
  controller: GridController<Row>,
  columnId: string,
  kinds: Set<TScopeKind>
) {
  const filter = filterShowing(kinds);
  controller.store.dispatch({
    type: GridActionType.SetFilter,
    columnId,
    keepSelection: true,
    entry: filter
      ? { columnId, operator: OperatorId.Eq, value: { kind: FilterValueKind.Text, text: filter } }
      : null,
  });
}
