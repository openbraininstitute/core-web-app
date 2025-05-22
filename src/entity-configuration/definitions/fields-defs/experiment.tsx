import {
  renderArray,
  renderEmptyOrValue,
  EmptyPreview,
} from '@/entity-configuration/definitions/renderer';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';

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

      return <PreviewThumbnail resource={r} target="stimulus" />;
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

      return <PreviewThumbnail resource={r} target="simulation" />;
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
};
