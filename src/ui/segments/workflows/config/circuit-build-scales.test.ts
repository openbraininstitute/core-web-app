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

/** The `scale__in` the workflow's circuit table asks entitycore for. */
async function listedScales(
  targetType: TExtendedEntitiesTypeDict,
  filters: Record<string, unknown> = {}
) {
  await circuitBrowse(targetType).loader.build(null)({ filters, context });
  return getCircuits.mock.lastCall?.[0].filters.scale__in;
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

    expect(await listedScales(targetType)).toEqual(expected);
    expect(scaleFilterOptions(targetType).toSorted()).toEqual(expected.toSorted());

    await circuitBrowse(targetType).loader.facets?.build(null)({ filters: {}, context });
    expect(getCircuits.mock.lastCall?.[0]).toMatchObject({
      withFacets: true,
      filters: { scale__in: expected },
    });
  });

  it('keeps circuit synaptic physiology to the small scales', async () => {
    const targetType = ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign;

    expect(await listedScales(targetType)).toEqual(SMALL_SCALES);
    expect(scaleFilterOptions(targetType).toSorted()).toEqual(SMALL_SCALES.toSorted());
  });

  it('narrows to the scales a user filters on, and ignores the ones a workflow does not support', async () => {
    const filters = {
      scale__in: [CircuitScaleDictionary.Microcircuit, CircuitScaleDictionary.Region],
    };

    expect(
      await listedScales(ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign, filters)
    ).toEqual([CircuitScaleDictionary.Microcircuit]);
    expect(
      await listedScales(ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign, filters)
    ).toEqual(SMALL_SCALES);
  });
});
