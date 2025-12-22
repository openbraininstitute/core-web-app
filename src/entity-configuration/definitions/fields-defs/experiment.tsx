import get from 'es-toolkit/compat/get';

import { ReactNode } from 'react';

import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import { PreviewThumbnail } from '@/features/thumbnail/preview';
import {
  renderArray,
  renderEmptyOrValue,
  EmptyPreview,
  renderDictionaryKeys,
} from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { hasAssets } from '@/api/entitycore/guards';

import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type {
  EntityCoreObjectTypes,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';

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
      renderEmptyOrValue(renderArray('injection_location' in r ? r.injection_location : [])),
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
      renderEmptyOrValue(renderArray('recording_location' in r ? r.recording_location : [])),
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
          entity={r}
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
          entity={r}
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
  [EntityCoreFields.CircuitNumberNeurons]: {
    title: 'Number of neurons',
    filter: null,
    render: (r) => {
      return 'number_neurons' in r ? r.number_neurons : '-';
    },
    isDisplayable: true,
    style: { width: 70 },
  },
  [EntityCoreFields.CircuitNumberSynapses]: {
    title: 'Number of synapses',
    filter: null,
    render: (r) => {
      return 'number_synapses' in r ? r.number_synapses : '-';
    },
    isDisplayable: true,
    style: { width: 70 },
  },
  [EntityCoreFields.CircuitNumberConnections]: {
    title: 'Number of connections',
    filter: null,
    render: (r) => {
      return 'number_connections' in r ? r.number_connections : '-';
    },
    isDisplayable: true,
    style: { width: 70 },
  },
  // TODO: this is not need for the mmt
  [EntityCoreFields.ScanParameters]: {
    title: 'Scan parameters',
    filter: null,
    render: (r) => {
      return renderEmptyOrValue(
        renderDictionaryKeys(
          get(r, 'simulations[0].scan_parameters', {}),
          ({ field }) => (
            <div className="border-neutral-1 text-primary-8 w-max rounded-full border px-2 py-1 shadow-sm">
              {field}
            </div>
          ),
          'flex flex-wrap gap-2 items-center justify-start text-sm'
        )
      );
    },
    isDisplayable: true,
    isFilterable: false,
  },
  [EntityCoreFields.SimulationCampaignStatus]: {
    title: 'Status',
    filter: null,
    render: (r) => {
      const status = get(r, 'simulations[0].executions[0].status', '') as EntitycoreExecutionStatus;
      const statusMap: Record<EntitycoreExecutionStatus, ReactNode> = {
        created: (
          <div className="text-primary-8 w-max rounded-full px-3 py-1 text-sm font-bold shadow-sm">
            Created
          </div>
        ),
        pending: (
          <div className="w-max rounded-full px-3 py-1 text-sm font-bold text-gray-500 shadow-sm">
            Pending
          </div>
        ),
        running: (
          <div className="text-primary-6 w-max rounded-full px-3 py-1 text-sm font-bold shadow-sm">
            Running
          </div>
        ),
        done: (
          <div className="w-max rounded-full px-3 py-1 text-sm font-bold text-green-500 shadow-sm">
            Completed
          </div>
        ),
        error: (
          <div className="w-max rounded-full px-3 py-1 text-sm font-bold text-red-500 shadow-sm">
            Error
          </div>
        ),
      };
      const component = get(
        statusMap,
        status,
        <div className="w-max rounded-full px-3 py-1 text-sm font-bold text-gray-800 shadow-sm">
          Generated
        </div>
      );
      if (component) {
        return <div className="flex w-full items-center justify-center">{component}</div>;
      }
      return null;
    },
    isDisplayable: true,
    isFilterable: false,
  },
  [EntityCoreFields.CircuitName]: {
    title: 'Circuit',
    filter: null,
    render: (r) => renderEmptyOrValue(get(r, 'circuit.name', '')),
    isDisplayable: true,
    isFilterable: false,
  },
  [EntityCoreFields.MEModelName]: {
    title: 'ME-model',
    filter: null,
    render: (r) => renderEmptyOrValue(get(r, 'memodel.name', '')),
    isDisplayable: true,
    isFilterable: false,
  },
};
