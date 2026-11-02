import { EDITABLE_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/editable-cell';
import { VISIBILITY_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/visibility-cell';
import { VISIBILITY_HEADER_RENDERER } from '@/features/data-grid/bindings/entitycore/renderers/visibility-header';
import { Align, FilterOptionsKind, OperatorId } from '@/features/data-grid/core';

import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IColumnModel } from '@/features/data-grid/core';

interface IHasAuthorizedPublic {
  authorized_public?: boolean | null;
}

/** Order weight that puts a column ahead of every column declaring none. */
const FIRST_COLUMN_ORDER = -10_000;

/**
 * Public or project, from `authorized_public` alone. The filter is that bare boolean
 * param (`AuthorizedFilterMixin`), which is not an ordering field, so the column is
 * unsortable.
 */
export function visibilityColumn<Row>(): IColumnModel<Row> {
  return {
    id: 'visibility',
    header: 'Public / Project',
    order: FIRST_COLUMN_ORDER,
    sortable: false,
    getValue: (r) => {
      const isPublic = (r as IHasAuthorizedPublic).authorized_public;
      if (typeof isPublic !== 'boolean') return '';
      return isPublic ? 'Public' : 'Project';
    },
    cellRenderer: VISIBILITY_RENDERER,
    headerRenderer: VISIBILITY_HEADER_RENDERER,
    divider: true,
    width: { width: 72, minWidth: 72 },
    align: Align.Center,
    filter: {
      operators: [OperatorId.Eq],
      field: 'authorized_public',
      targets: [
        {
          id: 'visibility',
          label: 'Public / Project',
          field: 'authorized_public',
          operators: [OperatorId.Eq],
          options: {
            kind: FilterOptionsKind.Static,
            items: [
              { id: 'true', label: 'Public' },
              { id: 'false', label: 'Project' },
            ],
          },
          description: 'Public data, or data private to a project',
        },
      ],
    },
  };
}

/** Whether the record belongs to the current project, so it can be edited. Not filterable. */
export function editableColumn<Row>(): IColumnModel<Row> {
  return {
    id: 'editable',
    header: 'Editable?',
    order: FIRST_COLUMN_ORDER + 1,
    sortable: false,
    // the cell needs the current project, which a cached definition cannot hold
    getValue: () => '',
    cellRenderer: EDITABLE_RENDERER,
    divider: true,
    width: { width: 96, minWidth: 96 },
    align: Align.Center,
  };
}

const WITH_COLUMNS = new WeakMap<TAnyEntityGridDefinition, TAnyEntityGridDefinition>();

/** The definition with the two ownership columns added, cached so every mount sees one object. */
export function withVisibilityColumns(
  definition: TAnyEntityGridDefinition
): TAnyEntityGridDefinition {
  let extended = WITH_COLUMNS.get(definition);
  if (!extended) {
    extended = {
      ...definition,
      schema: {
        ...definition.schema,
        columns: [visibilityColumn(), editableColumn(), ...definition.schema.columns],
      },
    };
    WITH_COLUMNS.set(definition, extended);
  }
  return extended;
}
