import {
  renderArray,
  renderEmptyOrValue,
  EmptyPreview,
} from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type {
  EntityCoreObjectTypes,
  EntityCoreSimulationObjectTypes,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';

import { hasAssets } from '@/api/entitycore/guards';

import PreviewThumbnail from '@/features/thumbnail/preview';

export const FieldsDefinition: Partial<FieldsDefinitionRegistry<EntityCoreObjectTypes>> = {
  [EntityCoreFields.SimulationSeed]: {
    className: 'text-center',
    title: 'Seed',
    filter: null,
    render: (r) => renderEmptyOrValue('seed' in r ? r.seed : undefined),
    vocabulary: {
      plural: 'Seeds',
      singular: 'Seed',
    },
    style: { width: 184, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.InjectionLocation]: {
    className: 'text-center',
    title: 'Injection location',
    filter: null,
    render: (r) =>
      renderEmptyOrValue(renderArray((r as EntityCoreSimulationObjectTypes).injection_location)),
    vocabulary: {
      plural: 'Injection locations',
      singular: 'Injection location',
    },
    style: { width: 184, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.RecordingLocation]: {
    className: 'text-center',
    title: 'Recording location',
    filter: null,
    render: (r) =>
      renderEmptyOrValue(renderArray((r as EntityCoreSimulationObjectTypes).recording_location)),
    vocabulary: {
      plural: 'Recording locations',
      singular: 'Recording location',
    },
    style: { width: 184, align: 'left' },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.SimulationStatus]: {
    className: 'text-center',
    title: 'Status',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue('status' in r ? r.status : undefined),
    vocabulary: {
      plural: 'Statuses',
      singular: 'Status',
    },
    style: { width: 184, align: 'left' },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.SimulationStimulus]: {
    className: 'text-center',
    title: 'Stimulus',
    filter: null,
    render: (r) => {
      if (
        !hasAssets(r) ||
        (r.type !== 'single_neuron_synaptome_simulation' && r.type !== 'single_neuron_simulation')
      )
        return EmptyPreview;

      return (
        <PreviewThumbnail
          resource={r}
          target="stimulus"
          width={184}
          height={116}
          className="h-full"
        />
      );
    },
    vocabulary: {
      plural: 'Stimuli',
      singular: 'Stimulus',
    },
    style: { width: 184, align: 'left' },
    isDisplayable: true,
    isFilterable: false,
  },
  [EntityCoreFields.SimulationResponse]: {
    className: 'text-center',
    title: 'Response',
    filter: null,
    render: (r) => {
      if (
        !hasAssets(r) ||
        (r.type !== 'single_neuron_synaptome_simulation' && r.type !== 'single_neuron_simulation')
      )
        return EmptyPreview;

      return (
        <PreviewThumbnail
          resource={r}
          target="simulation"
          width={184}
          height={116}
          className="h-full"
        />
      );
    },
    vocabulary: {
      plural: 'Responses',
      singular: 'Response',
    },
    style: { width: 184, align: 'left' },
    isDisplayable: true,
    isFilterable: false,
  },
  [EntityCoreFields.SynaptomeModelName]: {
    title: 'Synaptome name',
    filter: null,
    render: (r) => renderEmptyOrValue((r as ISingleNeuronSynaptomeSimulation).synaptome.name),
    vocabulary: {
      plural: 'Synaptomes name',
      singular: 'Synaptome name',
    },
    style: { width: 80 },
    isDisplayable: true,
  },
  [EntityCoreFields.NumberNeurons]: {
    title: 'Number of neurons',
    filter: null,
    render: (r) => {
      return 'number_neurons' in r ? r.number_neurons : '-';
    },
    isDisplayable: true,
  },
  [EntityCoreFields.NumberSynapses]: {
    title: 'Number of synapses',
    filter: null,
    render: (r) => {
      return 'number_synapses' in r ? r.number_synapses : '-';
    },
    isDisplayable: true,
  },
  [EntityCoreFields.NumberConnections]: {
    title: 'Number of connections',
    filter: null,
    render: (r) => {
      return 'number_connections' in r ? r.number_connections : '-';
    },
    isDisplayable: true,
  },
};
