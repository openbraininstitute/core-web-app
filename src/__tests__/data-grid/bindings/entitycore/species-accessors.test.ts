import { describe, expect, it } from 'vitest';

import { ionChannelModelSchema } from '@/features/data-grid/bindings/entitycore/schemas/ion-channel-model';
import { singleNeuronSynaptomeSchema } from '@/features/data-grid/bindings/entitycore/schemas/single-neuron-synaptome';
import { isEmptyCellValue } from '@/features/data-grid/renderers/aggrid/empty-cell';

import type { IColumnModel } from '@/features/data-grid/core';

/**
 * Species accessors vs. what the LIST endpoints actually return.
 *
 * ION CHANNEL MODEL — `GET /ion-channel-model` responds with
 * `IonChannelModelExpanded` = `IonChannelModelBaseMixin` + `ScientificArtifactRead`,
 * and `ScientificArtifactRead` composes `SubjectReadMixin` → `subject:
 * NestedSubjectRead`, whose `SpeciesStrainReadMixin` carries `species`/`strain`.
 * `_load_minimal` eager-loads `subject → species` / `subject → strain` and nothing
 * top-level. So the accessor must read the NESTED value; the legacy top-level one is
 * only a fallback (the hand-written `IonChannelModel` TS type still declares it).
 *
 * SINGLE NEURON SYNAPTOME — `SingleNeuronSynaptomeRead.me_model` is `NestedMEModel`,
 * which has no `species` at all, so that column is known-empty by construction. What
 * is pinned here is that it DEGRADES to the shared placeholder instead of throwing,
 * and that its filter — which does work server-side — stays wired to
 * `me_model__species__name`.
 */

function column<Row>(columns: ReadonlyArray<IColumnModel<Row>>, id: string): IColumnModel<Row> {
  const found = columns.find((c) => c.id === id);
  if (!found) throw new Error(`no column "${id}"`);
  return found;
}

/** `getValue` is optional on the model; every column asserted here declares one. */
function read<Row>(col: IColumnModel<Row>, row: Row): unknown {
  if (!col.getValue) throw new Error(`column "${col.id}" has no getValue`);
  return col.getValue(row);
}

describe('ion-channel-model — Species reads the nested subject', () => {
  const species = column(ionChannelModelSchema.columns, 'species');
  const strain = column(ionChannelModelSchema.columns, 'strainName');

  it('resolves the wire shape: subject.species.name', () => {
    expect(read(species, { subject: { species: { name: 'Mus musculus' } } } as never)).toBe(
      'Mus musculus'
    );
  });

  it('prefers the nested value when a row carries BOTH shapes', () => {
    expect(
      read(species, {
        species: { name: 'legacy top-level' },
        subject: { species: { name: 'Mus musculus' } },
      } as never)
    ).toBe('Mus musculus');
  });

  it('falls back to the legacy top-level species when there is no subject', () => {
    expect(read(species, { species: { name: 'Rattus norvegicus' } } as never)).toBe(
      'Rattus norvegicus'
    );
  });

  it('degrades to the empty placeholder rather than throwing on an empty row', () => {
    expect(isEmptyCellValue(read(species, {} as never))).toBe(true);
    expect(isEmptyCellValue(read(species, { subject: null } as never))).toBe(true);
    expect(isEmptyCellValue(read(species, { subject: { species: null } } as never))).toBe(true);
  });

  it('still sorts and facet-filters on subject__species__name', () => {
    expect(species.sortField).toBe('subject__species__name');
    expect(species.filter?.field).toBe('subject__species__name');
  });

  it('Strain already read the nested subject and is unchanged', () => {
    expect(read(strain, { subject: { strain: { name: 'C57BL/6J' } } } as never)).toBe('C57BL/6J');
    expect(isEmptyCellValue(read(strain, {} as never))).toBe(true);
    expect(strain.sortField).toBe('subject__strain__name');
  });
});

describe('single-neuron-synaptome — Species is known-empty but never throws', () => {
  const species = column(singleNeuronSynaptomeSchema.columns, 'species');

  it('is EMPTY for the shape `NestedMEModel` actually returns (id/name/mtypes/etypes)', () => {
    const wireRow = {
      me_model: {
        id: 'me-1',
        type: 'me_model',
        name: 'ME-model 1',
        validation_status: 'done',
        mtypes: [{ pref_label: 'L5_TPC' }],
        etypes: [{ pref_label: 'cADpyr' }],
      },
    };
    expect(isEmptyCellValue(read(species, wireRow as never))).toBe(true);
  });

  it('degrades to the empty placeholder rather than throwing when me_model is absent', () => {
    expect(isEmptyCellValue(read(species, {} as never))).toBe(true);
    expect(isEmptyCellValue(read(species, { me_model: null } as never))).toBe(true);
  });

  it('would render a species if the backend ever nested one (no accessor change needed)', () => {
    expect(read(species, { me_model: { species: { name: 'Mus musculus' } } } as never)).toBe(
      'Mus musculus'
    );
  });

  it('keeps the WORKING me_model__species__name filter and stays non-sortable', () => {
    expect(species.filter?.field).toBe('me_model__species__name');
    expect(species.sortable ?? false).toBe(false);
  });

  it('every OTHER me_model.… read resolves against the NestedMEModel shape', () => {
    const wireRow = {
      me_model: {
        name: 'ME-model 1',
        validation_status: 'done',
        mtypes: [{ pref_label: 'L5_TPC' }],
        etypes: [{ pref_label: 'cADpyr' }],
      },
    } as never;
    expect(read(column(singleNeuronSynaptomeSchema.columns, 'me_model'), wireRow)).toBe(
      'ME-model 1'
    );
    expect(read(column(singleNeuronSynaptomeSchema.columns, 'mtype'), wireRow)).toBe('L5_TPC');
    expect(read(column(singleNeuronSynaptomeSchema.columns, 'etype'), wireRow)).toBe('cADpyr');
    expect(
      read(column(singleNeuronSynaptomeSchema.columns, 'meModelValidationStatus'), wireRow)
    ).toBe('Done');
  });
});
