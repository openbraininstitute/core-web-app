import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { FilterOptionsKind } from '@/features/data-grid/core';
import { ActivityValues, getWorkflow } from '@/ui/segments/workflows/config';

describe('small-scale circuit workflow browse', () => {
  it('uses static Scale options limited to the scales supported by the workflow', () => {
    const workflow = getWorkflow({
      activity: ActivityValues.Build,
      targetType: ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign,
    });
    const schema =
      workflow?.browseConfig?.[ExtendedEntitiesTypeDict.Circuit]?.gridDefinitionOverride?.schema;
    const scale = schema?.columns.find((column) => column.id === EntityCoreFields.CircuitScale);

    expect(scale?.filter?.options).toEqual({
      kind: FilterOptionsKind.Static,
      items: [
        { id: CircuitScaleDictionary.Single, label: 'Single' },
        { id: CircuitScaleDictionary.PairNeuron, label: 'Pair neuron' },
        {
          id: CircuitScaleDictionary.SmallMicrocircuit,
          label: 'Small Microcircuit',
        },
      ],
    });
  });
});
