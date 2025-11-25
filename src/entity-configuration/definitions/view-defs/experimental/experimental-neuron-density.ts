import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const viewDefForExperimentalNeuronDensity: ViewDefinitionConfig = {
  title: 'Neuron density',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.ExperimentalNeuronDensity,
  columns: [
    EntityCoreFields.BrainRegion,
    EntityCoreFields.MType,
    EntityCoreFields.EType,
    EntityCoreFields.NeuronDensity,
    EntityCoreFields.NumberOfMeasurements,
    EntityCoreFields.Name,
    EntityCoreFields.Species,
    EntityCoreFields.SubjectAge,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
  ],
  cardViewFields: [
    { field: EntityCoreFields.Name, className: 'col-span-2' },
    { field: EntityCoreFields.NeuronMorphologyWidth, className: 'col-span-2' },
    { field: EntityCoreFields.NeuronMorphologyHeight, className: 'col-span-2' },
    { field: EntityCoreFields.NeuronMorphologyDepth, className: 'col-span-2' },
    { field: EntityCoreFields.AxonTotalLength, className: 'col-span-2' },
    { field: EntityCoreFields.AxonStrahlerNumber, className: 'col-span-2' },
    { field: EntityCoreFields.AxonArborAsymmetryIndex, className: 'col-span-2' },
    { field: EntityCoreFields.BasalDendriticTotalLength, className: 'col-span-2' },
    { field: EntityCoreFields.BasalDendriteStrahlerNumber, className: 'col-span-2' },
    { field: EntityCoreFields.BasalArborAsymmetryIndex, className: 'col-span-2' },
    { field: EntityCoreFields.ApicalDendriticTotalLength, className: 'col-span-2' },
    { field: EntityCoreFields.ApicalDendtriteStrahlerNumber, className: 'col-span-2' },
    { field: EntityCoreFields.SomaDiameter, className: 'col-span-2' },
    { field: EntityCoreFields.ApicalArborAsymmetryIndex, className: 'col-span-2' },
    { field: EntityCoreFields.BrainRegion, className: 'col-span-2' },
    { field: EntityCoreFields.MType, className: 'col-span-2' },
    { field: EntityCoreFields.Species, className: 'col-span-2' },
    { field: EntityCoreFields.Contributions, className: 'col-span-2' },
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.SubjectAge },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.NeuronDensity },
    { field: EntityCoreFields.NumberOfMeasurements },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.Species },
    { field: EntityCoreFields.EType },
    { field: EntityCoreFields.License, className: 'col-start-2 row-start-3' },
  ],
  curated: false,
  mlTopic: 'cell composition',
};
