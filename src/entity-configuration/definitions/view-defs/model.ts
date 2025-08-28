import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { DataTypeGroup } from '@/entity-configuration/definitions/view-defs/types';
import { DataType } from '@/constants/explore-section/list-views';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export const ViewsDefinition: { [key: string]: ViewDefinitionConfig } = {
  [DataType.CircuitEModel]: {
    title: 'E-model',
    group: DataTypeGroup.ModelData,
    name: EntitySlug.EModel,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.EModelResponse,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.MType,
      EntityCoreFields.EType,
      EntityCoreFields.EModelExemplarMorphology,
      EntityCoreFields.EModelScore,
      EntityCoreFields.Contributions,
      EntityCoreFields.CreationDate,
    ],
    curated: true,
    summaryViewFields: [
      { field: EntityCoreFields.BrainRegion },
      { field: EntityCoreFields.EModelScore },
      { field: EntityCoreFields.MType, className: 'col-span-3' },
      { field: EntityCoreFields.EType },
    ],
  },
  [DataType.CircuitMEModel]: {
    title: 'ME-model',
    group: DataTypeGroup.ModelData,
    name: EntitySlug.MeModel,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.MEModelMorphologyPreview,
      EntityCoreFields.MEModelTracePreview,
      EntityCoreFields.MEModelValidationStatus,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.MType,
      EntityCoreFields.EType,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    curated: false,
    summaryViewFields: [
      { field: EntityCoreFields.BrainRegion, className: 'col-span-2' },
      { field: EntityCoreFields.MEModelValidationStatus, className: 'col-span-2 text-left' },
      { field: EntityCoreFields.MType, className: 'col-span-4' },
      { field: EntityCoreFields.EType, className: 'col-span-4' },
    ],
  },
  [DataType.SingleNeuronSynaptome]: {
    title: 'Synaptome',
    group: DataTypeGroup.ModelData,
    name: EntitySlug.SingleNeuronSynaptome,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.SynaptomeUsedMEModelName,
      EntityCoreFields.MType,
      EntityCoreFields.EType,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
    curated: false,
    summaryViewFields: [
      { field: EntityCoreFields.BrainRegion, className: 'col-span-1' },
      { field: EntityCoreFields.License, className: 'col-span-1' },
    ],
  },
  [DataType.Circuit]: {
    title: 'Circuit',
    name: EntitySlug.Circuit,
    curated: false,
    columns: [
      EntityCoreFields.Download,
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.CircuitSubCircuit,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CircuitScale,
      EntityCoreFields.CircuitNumberNeurons,
      EntityCoreFields.CircuitNumberSynapses,
      EntityCoreFields.CircuitNumberConnections,
      EntityCoreFields.Species,
      EntityCoreFields.CircuitPublishedIn,
      EntityCoreFields.CircuitExperimentDate,
      EntityCoreFields.CircuitBuildCategory,
    ],
    summaryViewFields: [
      { field: EntityCoreFields.BrainRegion, className: 'col-span-1 col-start-1' },
      { field: EntityCoreFields.CircuitRootCircuit, className: 'col-span-1 col-start-1' },
      { field: EntityCoreFields.CircuitScale, className: 'col-span-1 col-start-1' },
      { field: EntityCoreFields.License, className: 'col-span-1 col-start-1' },
      {
        field: EntityCoreFields.CircuitNumberNeurons,
        className: 'col-start-2 row-start-1',
      },
      {
        field: EntityCoreFields.CircuitNumberConnections,
        className: 'col-start-2 row-start-2',
      },
      {
        field: EntityCoreFields.CircuitNumberSynapses,
        className: 'col-start-2 row-start-3',
      },
      {
        field: EntityCoreFields.CircuitPublishedIn,
        className: 'col-start-3 row-start-1',
      },
      {
        field: EntityCoreFields.CircuitExperimentDate,
        className: 'col-start-3 row-start-2',
      },
      {
        field: EntityCoreFields.CircuitContactEmail,
        className: 'col-start-3 row-start-3',
      },
    ],
  },
  [DataType.SmallMicrocircuit]: {
    title: 'Small microcircuit',
    name: EntitySlug.SmallMicrocircuit,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CircuitNumberNeurons,
      EntityCoreFields.CircuitNumberSynapses,
      EntityCoreFields.CircuitNumberConnections,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
  },
  [DataType.PairedNeuronCircuit]: {
    title: 'Paired neurons',
    name: EntitySlug.PairedNeuronsCircuit,
    curated: false,
    columns: [
      EntityCoreFields.Name,
      EntityCoreFields.Description,
      EntityCoreFields.BrainRegion,
      EntityCoreFields.CircuitNumberNeurons,
      EntityCoreFields.CircuitNumberSynapses,
      EntityCoreFields.CircuitNumberConnections,
      EntityCoreFields.CreatedBy,
      EntityCoreFields.CreationDate,
    ],
  },
};
