import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

const getCircuits = vi.fn().mockResolvedValue({ data: [], pagination: { total_items: 0 } });

vi.mock('@/api/entitycore/queries/model/circuit', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCircuits,
}));

const { CircuitScaleDictionary } = await import('@/api/entitycore/types/entities/circuit');
const { ExtendedEntitiesTypeDict } = await import('@/api/entitycore/types/extended-entity-type');
const { EntityCoreFields } = await import('@/entity-configuration/definitions/fields-defs/enums');
const { FilterOptionsKind } = await import('@/features/data-grid/core');
const { BuildWorkflows } = await import('./activities/build');

const context = { virtualLabId: 'lab-1', projectId: 'project-1' };

const SMALL_SCALES = [
  CircuitScaleDictionary.Single,
  CircuitScaleDictionary.PairNeuron,
  CircuitScaleDictionary.SmallMicrocircuit,
];

function circuitBrowse(targetType: TExtendedEntitiesTypeDict) {
  const descriptor = BuildWorkflows.find((workflow) => workflow.targetType === targetType);
  const browse = descriptor?.browseConfig?.[ExtendedEntitiesTypeDict.Circuit];
  if (browse?.loader?.kind !== 'custom') {
    throw new Error(`${targetType} has no custom circuit loader`);
  }
  return { gridDefinition: browse.gridDefinitionOverride, loader: browse.loader };
}

/** The filters the workflow's circuit table sends entitycore. */
async function sentFilters(
  targetType: TExtendedEntitiesTypeDict,
  filters: Record<string, unknown> = {}
) {
  await circuitBrowse(targetType).loader.build(null)({ filters, context });
  return getCircuits.mock.lastCall?.[0].filters;
}

/** The scales the table's Scale column lets a user filter on. */
function scaleFilterOptions(targetType: TExtendedEntitiesTypeDict) {
  const column = circuitBrowse(targetType).gridDefinition?.schema.columns.find(
    ({ id }) => id === EntityCoreFields.CircuitScale
  );
  const options = column?.filter?.options;
  return options?.kind === FilterOptionsKind.Static ? options.items.map(({ id }) => id) : [];
}

describe('circuit scales offered by build workflows', () => {
  beforeEach(() => getCircuits.mockClear());

  it('lists microcircuits alongside the small scales for extracellular recording arrays', async () => {
    const targetType = ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign;
    const expected = [...SMALL_SCALES, CircuitScaleDictionary.Microcircuit];

    expect((await sentFilters(targetType))?.scale__in).toEqual(expected);
    expect(scaleFilterOptions(targetType).toSorted()).toEqual(expected.toSorted());

    await circuitBrowse(targetType).loader.facets?.build(null)({ filters: {}, context });
    expect(getCircuits.mock.lastCall?.[0]).toMatchObject({
      withFacets: true,
      filters: { scale__in: expected, number_neurons__lte: 10_000 },
    });
  });

  it('lists extracellular recording arrays only on circuits of up to 10,000 neurons', async () => {
    const targetType = ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign;

    expect((await sentFilters(targetType))?.number_neurons__lte).toBe(10_000);
    expect(
      (await sentFilters(targetType, { number_neurons__lte: 50_000 }))?.number_neurons__lte
    ).toBe(10_000);
    expect(
      (await sentFilters(targetType, { number_neurons__lte: 5_000 }))?.number_neurons__lte
    ).toBe(5_000);
  });

  it('keeps circuit synaptic physiology to the small scales', async () => {
    const targetType = ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign;
    const sent = await sentFilters(targetType);

    expect(sent?.scale__in).toEqual(SMALL_SCALES);
    expect(sent).not.toHaveProperty('number_neurons__lte');
    expect(scaleFilterOptions(targetType).toSorted()).toEqual(SMALL_SCALES.toSorted());
  });

  it('narrows to the supported scales a user filters on', async () => {
    const filters = {
      scale__in: [CircuitScaleDictionary.Microcircuit, CircuitScaleDictionary.Region],
    };

    expect(
      (await sentFilters(ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign, filters))
        ?.scale__in
    ).toEqual([CircuitScaleDictionary.Microcircuit]);
  });

  it('lists nothing when a user filters only on scales the workflow does not support', async () => {
    const filters = {
      scale__in: [CircuitScaleDictionary.Microcircuit, CircuitScaleDictionary.Region],
    };
    const { loader } = circuitBrowse(ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign);

    expect(await loader.build(null)({ filters, context })).toBeUndefined();
    expect(await loader.facets?.build(null)({ filters, context })).toBeUndefined();
    expect(getCircuits).not.toHaveBeenCalled();
  });
});
