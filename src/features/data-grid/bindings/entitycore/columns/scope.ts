import { SCOPE_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import { SCOPE_HEADER_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/scope-header';
import {
  SCOPE_COLUMN_ID,
  SCOPE_SORT_ORDERS,
  ScopeFilter,
  scopeFilterExcept,
  scopeFilterParams,
  scopeSortGroups,
} from '@/features/data-grid/bindings/entitycore/scope-filter';
import { Align, FilterOptionsKind, OperatorId } from '@/features/data-grid/core';

import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IColumnModel } from '@/features/data-grid/core';

interface IHasAuthorizedPublic {
  authorized_public?: boolean | null;
}

/** Order weight that puts a column ahead of every column declaring none. */
const FIRST_COLUMN_ORDER = -10_000;

/**
 * Public or project, for a listing that holds both. `authorized_public` and
 * `authorized_project_id` are bare params on every entity endpoint (`AuthorizedFilterMixin`);
 * neither is an ordering field.
 */
export function scopeColumn<Row>(): IColumnModel<Row> {
  return {
    id: SCOPE_COLUMN_ID,
    header: 'Scope',
    order: FIRST_COLUMN_ORDER,
    sortable: true,
    // the API cannot order by scope, so each kind is listed first in turn
    sortOrders: SCOPE_SORT_ORDERS.map((kind) => ({
      id: kind,
      groups: ({ projectId }) => scopeSortGroups(kind, projectId),
    })),
    getValue: (r) => {
      const isPublic = (r as IHasAuthorizedPublic).authorized_public;
      if (typeof isPublic !== 'boolean') return '';
      return isPublic ? 'Public' : 'Project';
    },
    cellRenderer: SCOPE_RENDERER,
    headerRenderer: SCOPE_HEADER_RENDERER,
    divider: true,
    // the header's toggles, and the filter button beside them
    width: { width: 96, minWidth: 96 },
    align: Align.Center,
    filter: {
      operators: [OperatorId.Eq],
      field: 'authorized_public',
      targets: [
        {
          id: 'scope',
          label: 'Scope',
          field: 'authorized_public',
          operators: [OperatorId.Eq],
          options: {
            kind: FilterOptionsKind.Static,
            items: [
              { id: ScopeFilter.Public, label: 'Public' },
              { id: ScopeFilter.PublicOnly, label: "Public, not this project's" },
              { id: ScopeFilter.PublicFromProject, label: "Public, this project's" },
              { id: ScopeFilter.Project, label: 'This project' },
              { id: ScopeFilter.Published, label: "This project's, made public" },
              { id: ScopeFilter.Private, label: "This project's, not public" },
            ],
          },
          description: "Public data, this project's data, or both",
        },
      ],
      toParams: (value, { projectId }) => scopeFilterParams(value, projectId),
      toExcept: (value, { projectId }) => scopeFilterExcept(value, projectId),
    },
  };
}

const WITH_SCOPE_COLUMN = new WeakMap<TAnyEntityGridDefinition, TAnyEntityGridDefinition>();

/** The definition with {@link scopeColumn} added, cached so every mount sees one object. */
export function withScopeColumn(definition: TAnyEntityGridDefinition): TAnyEntityGridDefinition {
  let extended = WITH_SCOPE_COLUMN.get(definition);
  if (!extended) {
    extended = {
      ...definition,
      schema: { ...definition.schema, columns: [scopeColumn(), ...definition.schema.columns] },
    };
    WITH_SCOPE_COLUMN.set(definition, extended);
  }
  return extended;
}
