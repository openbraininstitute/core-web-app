import {
  CellMorphologyGenerationType,
  CellMorphologyProtocolDesign,
} from '@/api/entitycore/types/entities/cell-morphology-protocol';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { FilterOptionsKind, FreeEntryKind, OperatorId, SortDirection } from '../../../core';
import {
  brainRegionColumn,
  contributionsColumn,
  mtypeColumn,
  nameColumn,
  previewColumn,
  registrationDateColumn,
  speciesColumn,
} from '../columns/catalog';
import { CellMorphologyPreview } from '../renderers/cell-morphology-cells';
import { registerSharedRenderers } from '../renderers/register';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { IAdvancedFilterGroup, IGridSchema, TFilterOptionsSource } from '../../../core';
import type { CellRendererRegistry } from '../../../react';
import type { IEntityGridDefinition } from '../registry';

/** Static option list from a `{ Foo: { key, label } }` enum dict. */
function staticOptions(dict: Record<string, { key: string; label: string }>): TFilterOptionsSource {
  return {
    kind: FilterOptionsKind.Static,
    items: Object.values(dict).map((v) => ({ id: v.key, label: v.label })),
  };
}

/**
 * ADVANCED FILTERS — `GET /cell-morphology` params with no column in this grid.
 *
 * Every field/operator pair below was checked against the live OpenAPI spec; the
 * emitted param is named in each comment. Nothing here is inferred from a naming
 * convention.
 */
const cellMorphologyAdvancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
  {
    id: 'protocol',
    label: 'Protocol',
    description: 'How each morphology was produced.',
    filters: [
      {
        id: 'generationType',
        label: 'Generation type',
        field: 'cell_morphology_protocol__generation_type',
        // `…__in` + `…` (exact). `…__not_in` is deliberately NOT offered here: the
        // entity domain config applies `cell_morphology_protocol__generation_type__not_in`
        // unconditionally to this listing (see `cellMorphologyGenerationTypeFilter`)
        // and host params are merged AFTER filters, so a user's `not_in` would be
        // silently overwritten. `__in` composes with it correctly (intersection).
        operators: [OperatorId.In, OperatorId.Eq],
        options: staticOptions(CellMorphologyGenerationType),
        description: 'This listing already excludes synthesized and modified morphologies',
      },
      {
        id: 'protocolDesign',
        label: 'Protocol design',
        field: 'cell_morphology_protocol__protocol_design',
        // `…__in`, `…__not_in`, `…` (exact)
        operators: [OperatorId.In, OperatorId.NotIn, OperatorId.Eq],
        options: staticOptions(CellMorphologyProtocolDesign),
        description: 'Experimental or computational design of the protocol',
      },
      {
        id: 'protocolName',
        label: 'Protocol name',
        field: 'cell_morphology_protocol__name',
        // `…__ilike`, `…__in`, `…` (exact)
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter part of a protocol name, like Patch-clamp',
      },
      {
        id: 'protocolDocument',
        label: 'Protocol document',
        field: 'cell_morphology_protocol__protocol_document',
        // `…__ilike`, `…__in`, `…` (exact)
        operators: [OperatorId.Ilike, OperatorId.In, OperatorId.Eq],
        freeEntry: FreeEntryKind.Text,
        description: 'Reference document describing the protocol',
        placeholder: 'Enter part of a document reference, like doi.org/10.1038',
      },
      {
        id: 'protocolId',
        label: 'Protocol ID',
        field: 'cell_morphology_protocol__id',
        // `…__id__in`. The scalar `…__id` adds nothing over a one-element list.
        operators: [OperatorId.In],
        description: 'Exact protocol entity id',
      },
    ],
  },
  {
    id: 'subject',
    label: 'Subject',
    description: 'The animal the morphology was reconstructed from.',
    filters: [
      {
        id: 'strainName',
        label: 'Strain',
        // `subject__strain__name__ilike`, `subject__strain__name__in`
        field: 'subject__strain__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
        placeholder: 'Enter part of a strain name, like C57BL/6J',
      },
      {
        id: 'strainId',
        label: 'Strain ID',
        // `subject__strain__id__in`
        field: 'subject__strain__id',
        operators: [OperatorId.In],
      },
      {
        id: 'subjectName',
        label: 'Subject name',
        // `subject__name__ilike`, `subject__name__in`
        field: 'subject__name',
        operators: [OperatorId.Ilike, OperatorId.In],
        freeEntry: FreeEntryKind.Text,
      },
      {
        id: 'subjectId',
        label: 'Subject ID',
        // `subject__id__in`
        field: 'subject__id',
        operators: [OperatorId.In],
      },
    ],
  },
  {
    id: 'record',
    label: 'Record',
    filters: [
      {
        id: 'hasSegmentedSpines',
        label: 'Segmented spines',
        // `has_segmented_spines` (boolean)
        field: 'has_segmented_spines',
        operators: [OperatorId.Bool],
        description: 'Whether dendritic spines are segmented in the reconstruction',
      },
      {
        id: 'lifecycleStatus',
        label: 'Lifecycle status',
        // `lifecycle_status` (exact enum; the endpoint offers no list form)
        field: 'lifecycle_status',
        operators: [OperatorId.Eq],
        options: {
          kind: FilterOptionsKind.Static,
          items: [
            { id: 'draft', label: 'Draft' },
            { id: 'active', label: 'Active' },
            { id: 'disqualified', label: 'Disqualified' },
          ],
        },
      },
    ],
  },
];

/**
 * Re-authored cell-morphology grid schema, composed from the shared column catalog.
 * Column order matches the legacy `viewDefForCellMorphology` exactly (Preview,
 * BrainRegion, Species, M-type, Name, Contributions, Registration date) for parity.
 * The narrow filter (`cell_morphology_protocol__generation_type__not_in`) lives in
 * the entity domain config's `api.query.list`, so it is applied automatically by the
 * delegating data source — not restated here.
 */
export const cellMorphologySchema: IGridSchema<ICellMorphology> = {
  id: 'cell-morphology',
  getRowId: (row) => row.id,
  defaultSort: [{ columnId: 'registrationDate', direction: SortDirection.Desc }],
  rowHeight: 118,
  selection: { enabled: true },
  advancedFilters: cellMorphologyAdvancedFilters,
  columns: [
    previewColumn<ICellMorphology>({
      cellRenderer: 'cellMorphologyPreview',
      width: { width: 184, minWidth: 120, resizable: true },
    }),
    // Per-column ID targets are declared per-entity, not on the shared catalog
    // factory: the `__id__in` params below are confirmed on `GET /cell-morphology`,
    // but the same factories serve entities whose endpoints do not accept them.
    // `targets[0]` mirrors the factory's own filter so default behavior is
    // unchanged. `speciesColumn` already ships its own name/ID targets.
    brainRegionColumn<ICellMorphology>({
      filter: {
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'brain_region__name',
            operators: [OperatorId.In, OperatorId.Ilike],
            facetKey: 'brain_region',
            description: 'Brain region',
            options: { kind: FilterOptionsKind.Facets },
          },
          {
            id: 'id',
            label: 'ID',
            field: 'brain_region__id',
            operators: [OperatorId.In],
            description: 'Brain region ID',
          },
          {
            id: 'acronym',
            label: 'Acronym',
            field: 'brain_region__acronym',
            operators: [OperatorId.In],
            // Acronyms are not ids: without this the free-entry editor would reject
            // every token as a malformed UUID.
            freeEntry: FreeEntryKind.Text,
            description: 'Brain region acronym',
            placeholder: 'Paste one or more acronyms, like SSp-bfd',
          },
          {
            id: 'annotationValue',
            label: 'Annotation',
            field: 'brain_region__annotation_value',
            operators: [OperatorId.Eq],
            description: 'Brain region annotation value',
            placeholder: 'Enter an annotation value, like 329',
          },
        ],
      },
    }),
    speciesColumn<ICellMorphology>(),
    mtypeColumn<ICellMorphology>({
      filter: {
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'mtype__pref_label',
            operators: [OperatorId.In, OperatorId.Ilike],
            facetKey: 'mtype',
            description: 'Morphological type',
            options: { kind: FilterOptionsKind.Facets },
          },
          {
            id: 'id',
            label: 'ID',
            field: 'mtype__id',
            operators: [OperatorId.In],
            description: 'M-type ID',
          },
        ],
      },
    }),
    // The Name column has no filter on the shared factory (free-text search is the
    // toolbar's job), so this adds one: match the morphology's own entity id — the
    // case that makes a pasted id from a link or a report resolvable in the listing.
    // The shared factory declares no filter, so the serializer falls back to the
    // column id (`name` → `name__ilike`). Declaring one here MUST keep that as
    // `targets[0]`, or the default changes wire params — the ID target is purely
    // additive, for resolving an id pasted from a link or a report.
    nameColumn<ICellMorphology>({
      filter: {
        operators: [OperatorId.Ilike],
        field: 'name',
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'name',
            operators: [OperatorId.Ilike],
            description: 'Name',
          },
          {
            id: 'id',
            label: 'ID',
            field: 'id',
            operators: [OperatorId.In],
            description: 'Morphology ID',
          },
        ],
      },
    }),
    contributionsColumn<ICellMorphology>({
      filter: {
        targets: [
          {
            id: 'name',
            label: 'Name',
            field: 'contribution__pref_label',
            operators: [OperatorId.In, OperatorId.Ilike],
            facetKey: 'contribution',
            options: { kind: FilterOptionsKind.Facets },
          },
          {
            id: 'id',
            label: 'ID',
            field: 'contribution__id',
            operators: [OperatorId.In],
            description: 'Contributor ID',
          },
        ],
      },
    }),
    registrationDateColumn<ICellMorphology>(),
  ],
};

export const cellMorphologyGridDefinition: IEntityGridDefinition<ICellMorphology> = {
  dataType: ExtendedEntitiesTypeDict.CellMorphology,
  schema: cellMorphologySchema,
  registerCellRenderers: (registry: CellRendererRegistry) => {
    registerSharedRenderers(registry);
    registry.register('cellMorphologyPreview', CellMorphologyPreview);
  },
};
