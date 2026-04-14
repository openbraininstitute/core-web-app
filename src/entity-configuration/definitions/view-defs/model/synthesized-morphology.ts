import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewDefForSynthesizedCellMorphology: ViewDefinitionConfig = {
  title: 'Synthesized cell morphology',
  group: DataTypeGroup.ExperimentalData,
  name: EntitySlug.CellMorphology,
  columns: [
    EntityCoreFields.Preview,
    EntityCoreFields.BrainRegion,
    EntityCoreFields.MType,
    EntityCoreFields.Name,
    EntityCoreFields.SpeciesName,
    EntityCoreFields.Contributions,
    EntityCoreFields.RegistrationDate,
  ],
  curated: true,
  cardViewFields: [
    {
      field: EntityCoreFields.Name,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.NeuronMorphologyWidth,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.NeuronMorphologyHeight,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.NeuronMorphologyDepth,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.AxonTotalLength,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.AxonStrahlerNumber,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.AxonArborAsymmetryIndex,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.BasalDendriticTotalLength,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.BasalDendriteStrahlerNumber,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.BasalArborAsymmetryIndex,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.ApicalDendriticTotalLength,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.ApicalDendtriteStrahlerNumber,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.SomaDiameter,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.ApicalArborAsymmetryIndex,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.BrainRegion,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.MType,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.SpeciesName,
      className: 'col-span-2',
    },
    {
      field: EntityCoreFields.Contributions,
      className: 'col-span-2',
    },
  ],
  summaryViewFields: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.License },
    { field: EntityCoreFields.MType },
  ],
  miniDetailView: [
    { field: EntityCoreFields.BrainRegion },
    { field: EntityCoreFields.SpeciesName },
    { field: EntityCoreFields.MType },
    { field: EntityCoreFields.License },
  ],
  mlTopic: 'Neuron morphology',
};
