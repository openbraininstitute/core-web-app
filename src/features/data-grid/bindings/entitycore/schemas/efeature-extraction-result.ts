import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  descriptionColumn,
  nameColumn,
  registrationDateColumn,
} from '@/features/data-grid/bindings/entitycore/columns/catalog';
import { SortDirection } from '@/features/data-grid/core';

import type { ITaskResult } from '@/api/entitycore/types/entities/task-result';
import type { IEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridSchema } from '@/features/data-grid/core';

type Row = ITaskResult;

/**
 * Intracellular e-feature extraction results (`GET /task-result`, narrowed to
 * `task_result_type=efeature_extraction_result` by the entity's own `list`).
 *
 * Columns mirror `viewDefForEFeatureExtractionResult`: a task result carries no e-type,
 * brain region or species of its own, so the listing shows only what the entity has.
 * The entity declares `allowedFacets: false`, hence no set filters — the toolbar's
 * free-text search (`ilikeSearchEnabled`) is the filter for this listing.
 */
export const efeatureExtractionResultSchema: IGridSchema<Row> = {
  id: 'efeature-extraction-result',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: EntityCoreFields.RegistrationDate, direction: SortDirection.Desc }],
  selection: { enabled: true },
  columns: [
    nameColumn<Row>({ id: EntityCoreFields.Name, essential: true }),
    descriptionColumn<Row>({ id: EntityCoreFields.Description }),
    registrationDateColumn<Row>({ id: EntityCoreFields.RegistrationDate, essential: true }),
  ],
};

export const efeatureExtractionResultGridDefinition: IEntityGridDefinition<Row> = {
  dataType: ExtendedEntitiesTypeDict.EFeatureExtractionResult,
  schema: efeatureExtractionResultSchema,
};
