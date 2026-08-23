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

/** Mirrors `registry.ts`; a new listing added there must be added here too. */
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
    expect(column?.auxiliary).toBeFalsy();
    expect(column?.hiddenByDefault).toBeUndefined();
  });

  it.each(REGISTERED_DATA_TYPES)('%s resolves the column in the Data section', (dataType) => {
    const { schema } = definitionFor(dataType);
    const resolved = resolveColumns(schema, { dataType, section: WorkspaceSection.Data });
    const column = resolved.find((c) => c.id === 'lifecycleStatus');
    expect(column).toBeDefined();
    expect(column?.hiddenByDefaultResolved).toBe(false);
  });

  it.each(REGISTERED_DATA_TYPES)('%s renders the column LAST', (dataType) => {
    const { schema } = definitionFor(dataType);
    const resolved = resolveColumns(schema, { dataType, section: WorkspaceSection.Data });
    expect(resolved.at(-1)?.id).toBe('lifecycleStatus');
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
            value: { kind: FilterValueKind.Text, text: EntityLifecycleStatus.Active },
          },
        },
      }),
      schema
    );
    expect(params.lifecycle_status).toBe(EntityLifecycleStatus.Active);
    expect(params.lifecycle_status__in).toBeUndefined();
  });

  it.each(REGISTERED_DATA_TYPES)('%s offers Eq only, over the three statuses', (dataType) => {
    const { schema } = definitionFor(dataType);
    const column = schema.columns.find((c) => c.id === 'lifecycleStatus');
    expect(column?.filter?.operators).toEqual([OperatorId.Eq]);
    const target = column?.filter?.targets?.[0];
    expect(target?.field).toBe('lifecycle_status');
    expect(target?.operators).toEqual([OperatorId.Eq]);
    // no endpoint computes a `lifecycle_status` facet bucket, so facets would be empty
    expect(target?.options?.kind).toBe(FilterOptionsKind.Static);
    expect(
      target?.options?.kind === FilterOptionsKind.Static ? target.options.items : undefined
    ).toEqual([
      { id: EntityLifecycleStatus.Draft, label: 'Draft' },
      { id: EntityLifecycleStatus.Active, label: 'Active' },
      { id: EntityLifecycleStatus.Disqualified, label: 'Disqualified' },
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
      const params = serializeQuery(
        query({ sort: [{ columnId: 'lifecycleStatus', direction: SortDirection.Desc }] }),
        schema
      );
      expect(params.order_by).not.toContain('-lifecycle_status');
    }
  });
});

describe('lifecycle status — the pill renderer is available everywhere', () => {
  /** An unregistered renderer key silently degrades the cell to plain text. */
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
    expect(column?.getValue?.({ lifecycle_status: EntityLifecycleStatus.Active } as never)).toBe(
      'Active'
    );
    expect(column?.getValue?.({ lifecycle_status: EntityLifecycleStatus.Draft } as never)).toBe(
      'Draft'
    );
    expect(
      column?.getValue?.({ lifecycle_status: EntityLifecycleStatus.Disqualified } as never)
    ).toBe('Disqualified');
  });

  it('falls through to the shared empty cell when the value is absent', () => {
    const { schema } = definitionFor('emodel');
    const column = schema.columns.find((c) => c.id === 'lifecycleStatus');
    expect(column?.getValue?.({} as never)).toBe('');
    expect(getLifecycleStatusBadgeSpec(undefined)).toBeUndefined();
    expect(getLifecycleStatusBadgeSpec(null)).toBeUndefined();
  });

  it('maps each status to a light pill with a full-colour border and text', () => {
    expect(getLifecycleStatusBadgeSpec(EntityLifecycleStatus.Draft)).toMatchObject({
      label: 'Draft',
      tone: 'neutral',
    });
    expect(getLifecycleStatusBadgeSpec(EntityLifecycleStatus.Active)).toMatchObject({
      label: 'Active',
      tone: 'success',
    });
    expect(getLifecycleStatusBadgeSpec(EntityLifecycleStatus.Disqualified)).toMatchObject({
      label: 'Disqualified',
      tone: 'destructive',
    });
  });

  it('degrades a status the frontend does not know to a neutral pill, never nothing', () => {
    expect(getLifecycleStatusBadgeSpec('archived')).toMatchObject({
      label: 'archived',
      tone: 'neutral',
    });
  });
});
