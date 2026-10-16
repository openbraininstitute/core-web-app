import { SCOPE_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/scope-cell';
import { SCOPE_HEADER_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/scope-header';
import { Align, FilterOptionsKind, OperatorId } from '@/features/data-grid/core';

import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IColumnModel } from '@/features/data-grid/core';

interface IHasAuthorizedPublic {
  authorized_public?: boolean | null;
}

/** Order weight that puts a column ahead of every column declaring none. */
const FIRST_COLUMN_ORDER = -10_000;

/**
 * Public or project, for a listing that holds both. `authorized_public` is a bare boolean
 * param on every entity endpoint (`AuthorizedFilterMixin`); it is not an ordering field.
 */
export function scopeColumn<Row>(): IColumnModel<Row> {
  return {
    id: 'scope',
    header: 'Scope',
    order: FIRST_COLUMN_ORDER,
    sortable: false,
    getValue: (r) => {
      const isPublic = (r as IHasAuthorizedPublic).authorized_public;
      if (typeof isPublic !== 'boolean') return '';
      return isPublic ? 'Public' : 'Project';
    },
    cellRenderer: SCOPE_RENDERER,
    headerRenderer: SCOPE_HEADER_RENDERER,
    divider: true,
    width: { width: 56, minWidth: 56 },
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
              { id: 'true', label: 'Public' },
              { id: 'false', label: 'Project' },
            ],
          },
          description: 'Public data, or data private to this project',
        },
      ],
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
