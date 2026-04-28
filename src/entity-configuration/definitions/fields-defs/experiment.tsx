import get from 'es-toolkit/compat/get';

import { hasAssets } from '@/api/entitycore/guards';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  EmptyPreview,
  renderArray,
  renderDictionaryKeys,
  renderEmptyOrValue,
} from '@/entity-configuration/definitions/renderer';
import { getSkeletonizationStatusCountMap } from '@/entity-configuration/domain/processing/skeletonization-campaign';
import { LegacyCampaignStatusCell } from '@/features/task-runner/activity-execution/legacy-status-cell';
import { CampaignActivityStatusCell } from '@/features/task-runner/activity-execution/status-cell';
import { PreviewThumbnail } from '@/features/thumbnail/preview';

import type {
  EntityCoreObjectTypes,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';

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
  [EntityCoreFields.ActivityStatus]: {
    title: 'Status',
    filter: null,
    style: { width: 100 },
    render: (r) => {
      return <LegacyCampaignStatusCell campaignId={r.id} />;
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
    style: { width: 200 },
  },
  [EntityCoreFields.MEModelName]: {
    title: 'ME-model',
    filter: null,
    render: (r) => renderEmptyOrValue(get(r, 'memodel.name', '')),
    isDisplayable: true,
    isFilterable: false,
  },
  [EntityCoreFields.SkeletonizationCampaignStatus]: {
    title: 'Status',
    filter: null,
    style: { width: 160 },
    render: (r) => {
      return <CampaignActivityStatusCell campaignId={r.id} />;
    },
    isDisplayable: true,
    isFilterable: false,
  },
};
