import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';
import { buildCellRenderers } from '@/features/data-grid/bindings/entitycore/cell-renderers';
import { serializeQuery } from '@/features/data-grid/bindings/entitycore/query-serializer';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import {
  EntityLifecycleStatus,
  getLifecycleStatusBadgeSpec,
  LIFECYCLE_STATUS_RENDERER,
} from '@/features/data-grid/bindings/entitycore/renderers/lifecycle-status-cell';
import {
  advancedFilterDefsByKey,
  FilterOptionsKind,
  FilterValueKind,
  OperatorId,
  resolveColumns,
  SortDirection,
} from '@/features/data-grid/core';

import type { TAnyEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import type { IGridQuery } from '@/features/data-grid/core';

/**
 * LIFECYCLE STATUS — one visible column on every registered listing.
 *
 * ORACLE (both checked before the column was authored):
 *  - the live entitycore OpenAPI spec. Every endpoint behind a registered schema
 *    declares exactly ONE query param matching `lifecycle_status`: the bare
 *    `lifecycle_status`, typed `EntityLifecycleStatus | None`. There is NO
 *    `lifecycle_status__in` on any of them, which is why `OperatorId.Eq` is the only
 *    operator offered.
 *  - `app/filters/entity.py`, where `lifecycle_status` is declared once on
 *    `EntityFilterMixin`, and NO `Constants.ordering_model_fields` anywhere lists it —
 *    hence `sortable: false` everywhere. An `order_by` outside that allowlist is a 422.
 *
 * The value is RETURNED on every row: `lifecycle_status` sits on `EntityBaseReadMixin`
 * (`app/schemas/entity.py`), inherited by `EntityRead`, `EntityReadWoutAssets` and
 * `NestedEntityRead`, and is non-nullable. So this is never a blank column.
 */

/**
 * Every dataType with a registered grid definition. Mirrors `registry.ts`; a new
 * listing added there must be added here, which is what forces it to carry the column.
 */
const REGISTERED_DATA_TYPES: ReadonlyArray<string> = [
  'cell_morphology',
  'electrical_cell_recording',
  'ion_channel_recording',
  'universal_cell_morphology',
  'synthesized_cell_morphology',
  'experimental_neuron_density',
  'experimental_bouton_density',
  'experimental_synapses_per_connection',
  'em_cell_mesh',
  'emodel',
  'memodel',
  'me_model_circuit',
  'single_neuron_synaptome',
  'ion_channel_model',
  'analysis_notebook_template',
  'analysis_notebook_result',
  'simulatable_extracellular_recording_array',
  'single_neuron_simulation',
  'single_neuron_synaptome_simulation',
  'micro_circuit',
  'small_micro_circuit',
  'paired_neuron_circuit',
  'whole_brain',
  'single_neuron_circuit',
  'brain_region',
  'region_circuit_simulation',
  'whole_brain_circuit_simulation',
  'microcircuit_simulation',
  'small_microcircuit_simulation',
  'paired_neuron_circuit_simulation',
  'single_neuron_circuit_simulation',
  'me_model_circuit_simulation',
  'ion_channel_model_simulation',
  'simulation_campaign',
  'circuit',
];

function definitionFor(dataType: string): TAnyEntityGridDefinition {
  const definition = getEntityGridDefinition(dataType);
  if (!definition) throw new Error(`no registered grid definition for ${dataType}`);
  return definition;
}

function query(over: Partial<IGridQuery> = {}): IGridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}

describe('lifecycle status — coverage across every registered listing', () => {
  it.each(REGISTERED_DATA_TYPES)('%s declares a VISIBLE lifecycle-status column', (dataType) => {
    const { schema } = definitionFor(dataType);
    const column = schema.columns.find((c) => c.id === 'lifecycleStatus');
    expect(column).toBeDefined();
    // visible by default — NOT auxiliary, matching the legacy view-defs (PR #1850),
    // which add it to each entity's `columns`
    expect(column?.auxiliary).toBeFalsy();
    expect(column?.hiddenByDefault).toBeUndefined();
  });

  it.each(REGISTERED_DATA_TYPES)('%s resolves the column in the Data section', (dataType) => {
    const { schema } = definitionFor(dataType);
    const resolved = resolveColumns(schema, { dataType, section: WorkspaceSection.Data });
    const column = resolved.find((c) => c.id === 'lifecycleStatus');
    expect(column).toBeDefined();
    // it must actually render, not merely be declared
    expect(column?.hiddenByDefaultResolved).toBe(false);
  });

  it.each(REGISTERED_DATA_TYPES)('%s never sorts on lifecycle_status', (dataType) => {
    const { schema } = definitionFor(dataType);
    expect(schema.columns.find((c) => c.id === 'lifecycleStatus')?.sortable).toBe(false);
  });

  it.each(REGISTERED_DATA_TYPES)('%s filters on the BARE lifecycle_status param', (dataType) => {
    const { schema } = definitionFor(dataType);
    const params = serializeQuery(
      query({
        filters: {
          lifecycleStatus: {
            columnId: 'lifecycleStatus',
            operator: OperatorId.Eq,
            targetId: 'lifecycleStatus',
            value: { kind: FilterValueKind.Text, text: EntityLifecycleStatus.Active.key },
          },
        },
      }),
      schema
    );
    expect(params.lifecycle_status).toBe('active');
    // no endpoint declares a list form; emitting one would be silently ignored
    expect(params.lifecycle_status__in).toBeUndefined();
  });

  it.each(REGISTERED_DATA_TYPES)('%s offers Eq only, over the three statuses', (dataType) => {
    const { schema } = definitionFor(dataType);
    const column = schema.columns.find((c) => c.id === 'lifecycleStatus');
    expect(column?.filter?.operators).toEqual([OperatorId.Eq]);
    const target = column?.filter?.targets?.[0];
    expect(target?.field).toBe('lifecycle_status');
    expect(target?.operators).toEqual([OperatorId.Eq]);
    // an explicit STATIC source, not "no options ⇒ use the grid's facets": no endpoint
    // computes a `lifecycle_status` facet bucket, so that would be an empty picker
    expect(target?.options?.kind).toBe(FilterOptionsKind.Static);
    expect(
      target?.options?.kind === FilterOptionsKind.Static ? target.options.items : undefined
    ).toEqual([
      { id: 'draft', label: 'Draft' },
      { id: 'active', label: 'Active' },
      { id: 'disqualified', label: 'Disqualified' },
    ]);
  });

  it.each(REGISTERED_DATA_TYPES)('%s does not ALSO offer it as an advanced filter', (dataType) => {
    const { schema } = definitionFor(dataType);
    const fields = [...advancedFilterDefsByKey(schema).values()].map((d) => d.field);
    expect(fields).not.toContain('lifecycle_status');
  });

  it('sorting the column would be a 422 — no schema exposes a lifecycle sortField', () => {
    for (const dataType of REGISTERED_DATA_TYPES) {
      const { schema } = definitionFor(dataType);
      const column = schema.columns.find((c) => c.id === 'lifecycleStatus');
      expect(column?.sortField).toBeUndefined();
      // and asking for it anyway produces no order_by entry
      const params = serializeQuery(
        query({ sort: [{ columnId: 'lifecycleStatus', direction: SortDirection.Desc }] }),
        schema
      );
      expect(params.order_by).not.toContain('-lifecycle_status');
    }
  });
});

describe('lifecycle status — the pill renderer is available everywhere', () => {
  /**
   * `buildCellRenderers` registers the pill unconditionally, BEFORE the definition's
   * own hook — several definitions (the circuit family, the simulation campaigns)
   * declare no `registerCellRenderers` at all, and an unregistered key silently
   * degrades the cell to plain text.
   */
  it.each(REGISTERED_DATA_TYPES)('%s resolves the lifecycleStatus renderer key', (dataType) => {
    const registry = buildCellRenderers(definitionFor(dataType));
    expect(registry.has(LIFECYCLE_STATUS_RENDERER)).toBe(true);
    expect(
      definitionFor(dataType).schema.columns.find((c) => c.id === 'lifecycleStatus')?.cellRenderer
    ).toBe(LIFECYCLE_STATUS_RENDERER);
  });
});

describe('lifecycle status — cell value and pill', () => {
  it('shows the LABEL, not the wire value', () => {
    const { schema } = definitionFor('emodel');
    const column = schema.columns.find((c) => c.id === 'lifecycleStatus');
    expect(column?.getValue?.({ lifecycle_status: 'active' } as never)).toBe('Active');
    expect(column?.getValue?.({ lifecycle_status: 'draft' } as never)).toBe('Draft');
    expect(column?.getValue?.({ lifecycle_status: 'disqualified' } as never)).toBe('Disqualified');
  });

  it('falls through to the shared empty cell when the value is absent', () => {
    const { schema } = definitionFor('emodel');
    const column = schema.columns.find((c) => c.id === 'lifecycleStatus');
    expect(column?.getValue?.({} as never)).toBe('');
    expect(getLifecycleStatusBadgeSpec(undefined)).toBeUndefined();
    expect(getLifecycleStatusBadgeSpec(null)).toBeUndefined();
  });

  it('maps each status to a light pill with a full-colour border and text', () => {
    expect(getLifecycleStatusBadgeSpec('draft')).toMatchObject({
      label: 'Draft',
      tone: 'neutral',
    });
    expect(getLifecycleStatusBadgeSpec('active')).toMatchObject({
      label: 'Active',
      tone: 'success',
    });
    expect(getLifecycleStatusBadgeSpec('disqualified')).toMatchObject({
      label: 'Disqualified',
      tone: 'destructive',
    });
  });

  it('degrades a status the frontend does not know to a neutral pill, never nothing', () => {
    // the backend can add an EntityLifecycleStatus member before we do
    expect(getLifecycleStatusBadgeSpec('archived')).toMatchObject({
      label: 'archived',
      tone: 'neutral',
    });
  });
});
