import { describe, expect, it } from 'vitest';

import { WorkspaceSection } from '@/constants';

import { OperatorId, resolveColumns } from '../../../core';
import { serializeQuery } from '../query-serializer';
import { electricalCellRecordingSchema } from '../schemas/electrical-cell-recording';
import { ionChannelRecordingSchema } from '../schemas/ion-channel-recording';
import { universalCellMorphologySchema } from '../schemas/universal-cell-morphology';

import type { FilterModel, GridContext, GridQuery, GridSchema } from '../../../core';

/**
 * Per-entity parity harness for the experimental batch: locks the serialized query
 * params (filters → `field__op`, sort → order_by) and the context-resolved column
 * set/order to the legacy listing, the two invariants that guarantee no regression.
 * The exact legacy constraint keys are the source of truth (from the field-defs).
 */

function query(over: Partial<GridQuery> = {}): GridQuery {
  return { page: 1, pageSize: 20, sort: [], filters: {}, ...over };
}
const dataCtx = (dataType: string): GridContext => ({ dataType, section: WorkspaceSection.Data });

function ids<Row>(schema: GridSchema<Row>, ctx: GridContext): string[] {
  return resolveColumns(schema, ctx).map((c) => c.id);
}
function setIn(columnId: string): FilterModel {
  return {
    [columnId]: { columnId, operator: OperatorId.In, value: { kind: 'set', values: ['x'] } },
  };
}
function ilike(columnId: string): FilterModel {
  return {
    [columnId]: { columnId, operator: OperatorId.Ilike, value: { kind: 'text', text: 'foo' } },
  };
}

describe('electrical_cell_recording parity', () => {
  const s = electricalCellRecordingSchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('electrical_cell_recording'))).toEqual([
      'preview',
      'brainRegion',
      'species',
      'etype',
      'name',
      'contributions',
      'registrationDate',
    ]);
  });
  it('etype/species/contribution facets serialize to the legacy __in keys', () => {
    expect(serializeQuery(query({ filters: setIn('etype') }), s).etype__pref_label__in).toEqual([
      'x',
    ]);
    expect(
      serializeQuery(query({ filters: setIn('species') }), s).subject__species__name__in
    ).toEqual(['x']);
    expect(
      serializeQuery(query({ filters: setIn('contributions') }), s).contribution__pref_label__in
    ).toEqual(['x']);
  });
  it('default sort is -creation_date', () => {
    expect(
      serializeQuery(query({ sort: [{ columnId: 'registrationDate', direction: 'desc' }] }), s)
        .order_by
    ).toEqual(['-creation_date']);
  });
});

describe('ion_channel_recording parity', () => {
  const s = ionChannelRecordingSchema;
  it('columns match the legacy order', () => {
    expect(ids(s, dataCtx('ion_channel_recording'))).toEqual([
      'preview',
      'brainRegion',
      'species',
      'ionChannel',
      'temperature',
      'cellLine',
      'name',
      'contributions',
      'registrationDate',
    ]);
  });
  it('ion channel / cell line ilike + temperature range serialize to legacy keys', () => {
    expect(
      serializeQuery(query({ filters: ilike('ionChannel') }), s).ion_channel__name__ilike
    ).toBe('%foo%');
    expect(serializeQuery(query({ filters: ilike('cellLine') }), s).cell_line__ilike).toBe('%foo%');
    const temp: FilterModel = {
      temperature: {
        columnId: 'temperature',
        operator: OperatorId.Range,
        value: { kind: 'range', min: 20, max: 40 },
      },
    };
    const p = serializeQuery(query({ filters: temp }), s);
    expect(p.temperature__gte).toBe(20);
    expect(p.temperature__lte).toBe(40);
  });
});

describe('universal_cell_morphology parity', () => {
  const s = universalCellMorphologySchema;
  it('data section hides the build-workflow-only generation/protocol columns', () => {
    expect(ids(s, dataCtx('universal_cell_morphology'))).toEqual([
      'preview',
      'brainRegion',
      'species',
      'mtype',
      'name',
      'contributions',
      'registrationDate',
    ]);
  });
  it('build-workflow section reveals generation type + protocol design', () => {
    const cols = ids(s, {
      dataType: 'universal_cell_morphology',
      section: WorkspaceSection.BuildWorkflow,
    });
    expect(cols).toContain('generationType');
    expect(cols).toContain('protocolDesign');
  });
  it('generation/protocol serialize to the legacy protocol __in keys', () => {
    const gen: FilterModel = {
      generationType: {
        columnId: 'generationType',
        operator: OperatorId.In,
        value: { kind: 'set', values: ['digital_reconstruction'] },
      },
    };
    expect(
      serializeQuery(query({ filters: gen }), s).cell_morphology_protocol__generation_type__in
    ).toEqual(['digital_reconstruction']);
  });
  it('m-type is not sortable but still filters as mtype__pref_label__in', () => {
    expect(s.columns.find((c) => c.id === 'mtype')?.sortable).toBe(false);
    expect(serializeQuery(query({ filters: setIn('mtype') }), s).mtype__pref_label__in).toEqual([
      'x',
    ]);
  });
});
