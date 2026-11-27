import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { FilterOptionsKind, OperatorId } from '@/features/data-grid/core';
import { IconBadgeTone } from '@/ui/molecules/icon-badge/helpers';

import type { TEntitycoreParams } from '@/features/data-grid/bindings/entitycore/query-serializer';
import type {
  IColumnModel,
  IGridContext,
  IGridSchema,
  TFilterOptionsSource,
} from '@/features/data-grid/core';
import type { TIconName } from '@/ui/molecules/icon';
import type { TIconBadgeTone } from '@/ui/molecules/icon-badge/helpers';

export const PROJECT_OWNERSHIP_RENDERER = 'projectOwnership';
export const VISIBILITY_RENDERER = 'visibility';

type TBadgeSpec = { icon: TIconName; tone: TIconBadgeTone };

/** Option ids are persisted in saved filters; labels may change, ids may not. */
export const ProjectOwnership = { Current: 'current', Other: 'other' } as const;
export type TProjectOwnership = (typeof ProjectOwnership)[keyof typeof ProjectOwnership];
export const ProjectOwnershipLabel = {
  [ProjectOwnership.Current]: 'This project',
  [ProjectOwnership.Other]: 'Other project',
} as const;
/** Shown over an Other project cell: other projects are listed for their public data only. */
export const OTHER_PROJECT_HINT = 'Public data from another project';
/** Only the current project's rows carry a badge; the cells and the filter options share it. */
export const ProjectOwnershipBadge: Partial<Record<TProjectOwnership, TBadgeSpec>> = {
  [ProjectOwnership.Current]: { icon: 'people', tone: IconBadgeTone.Project },
};

export const Visibility = { Public: 'public', Private: 'private' } as const;
export type TVisibility = (typeof Visibility)[keyof typeof Visibility];
export const VisibilityLabel = {
  [Visibility.Public]: 'Public',
  [Visibility.Private]: 'Private',
} as const;
export const VisibilityBadge: Record<TVisibility, TBadgeSpec> = {
  [Visibility.Public]: { icon: 'globe', tone: IconBadgeTone.Public },
  [Visibility.Private]: { icon: 'lock', tone: IconBadgeTone.Neutral },
};

/** Pseudo-fields rewritten by {@link resolveOwnershipParams} into entitycore's scalar params. */
const OWNERSHIP_FIELD = 'project_ownership';
const VISIBILITY_FIELD = 'visibility';
const OWNERSHIP_COLUMN_ID = 'projectOwnership';
const VISIBILITY_COLUMN_ID = 'visibility';

function availableInCombinedData({ section, scope }: IGridContext) {
  return section === WorkspaceSection.Data && scope === WorkspaceScope.Combined;
}

/** Options that cover every row, each shown as its badge when it has one. */
function exhaustiveOptions<Id extends string>(
  labels: Record<Id, string>,
  badges: Partial<Record<Id, TBadgeSpec>>
): TFilterOptionsSource {
  return {
    kind: FilterOptionsKind.Static,
    items: (Object.keys(labels) as Id[]).map((id) => {
      const badge = badges[id];
      return badge ? { id, label: labels[id], badge } : { id, label: labels[id] };
    }),
    searchable: false,
    exhaustive: true,
  };
}

export function projectOwnershipColumn<Row>(): IColumnModel<Row> {
  return {
    id: OWNERSHIP_COLUMN_ID,
    header: 'Project',
    available: availableInCombinedData,
    width: { width: 124, minWidth: 120 },
    sortable: false,
    ownHoverCard: true,
    cellRenderer: PROJECT_OWNERSHIP_RENDERER,
    filter: {
      operators: [OperatorId.In],
      field: OWNERSHIP_FIELD,
      description:
        'This project: its data, private or public. Other project: only the public data of other projects.',
      options: exhaustiveOptions(ProjectOwnershipLabel, ProjectOwnershipBadge),
    },
  };
}

export function visibilityColumn<Row extends { authorized_public?: boolean }>(): IColumnModel<Row> {
  return {
    id: VISIBILITY_COLUMN_ID,
    header: 'Visibility',
    auxiliary: true,
    available: availableInCombinedData,
    sortable: false,
    width: { width: 128, minWidth: 116 },
    cellRenderer: VISIBILITY_RENDERER,
    getValue: ({ authorized_public }) => {
      if (typeof authorized_public !== 'boolean') return null;
      return VisibilityLabel[authorized_public ? Visibility.Public : Visibility.Private];
    },
    filter: {
      operators: [OperatorId.In],
      field: VISIBILITY_FIELD,
      options: exhaustiveOptions(VisibilityLabel, VisibilityBadge),
    },
  };
}

/** Puts the Project column first and the hidden Visibility column right after it. */
export function withOwnershipColumns<Row>(schema: IGridSchema<Row>): IGridSchema<Row> {
  const ids = new Set(schema.columns.map((c) => c.id));
  if (ids.has(OWNERSHIP_COLUMN_ID) || ids.has(VISIBILITY_COLUMN_ID)) return schema;
  return {
    ...schema,
    columns: [
      projectOwnershipColumn<Row>(),
      visibilityColumn<Row & { authorized_public?: boolean }>() as IColumnModel<Row>,
      ...schema.columns,
    ],
  };
}

function single(values: unknown): string | undefined {
  return Array.isArray(values) && values.length === 1 ? String(values[0]) : undefined;
}

/** None or both options ticked means no filter. */
export function resolveOwnershipParams(
  params: TEntitycoreParams,
  projectId?: string
): TEntitycoreParams {
  const {
    [`${OWNERSHIP_FIELD}__in`]: ownership,
    [`${VISIBILITY_FIELD}__in`]: visibility,
    ...rest
  } = params;
  const out: TEntitycoreParams = { ...rest };

  const owner = single(ownership);
  if (projectId && owner === ProjectOwnership.Current) out.authorized_project_id = projectId;
  if (projectId && owner === ProjectOwnership.Other) out.authorized_project_id__neq = projectId;

  const vis = single(visibility);
  if (vis === Visibility.Public) out.authorized_public = true;
  if (vis === Visibility.Private) out.authorized_public = false;

  return out;
}
