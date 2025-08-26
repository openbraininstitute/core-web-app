import groupBy from 'lodash/groupBy';
import values from 'lodash/values';
import sortBy from 'lodash/sortBy';
import find from 'lodash/find';
import get from 'lodash/get';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const EntityGroupDict = {
  Subcellular: 'Subcellular',
  Cellular: 'Cellular',
  Circuit: 'Circuit',
  System: 'System',
} as const;

export type TEntityGroupValue = keyof typeof EntityGroupDict;

export const CategoryDict = [
  { label: 'Build', value: 'build', disabled: false, name: 'Build' },
  { label: 'Simulate', value: 'simulate', disabled: false, name: 'Simulation' },
  { label: 'Extract', value: 'extract', disabled: true, name: undefined },
  { label: 'Optimize', value: 'optimize', disabled: true, name: undefined },
  { label: 'Validate', value: 'validate', disabled: true, name: undefined },
  { label: 'Process Data', value: 'process_data', disabled: true, name: undefined },
] as const;

export type TCategoryValue = (typeof CategoryDict)[number]['value'];

type EntityTypeProperties = {
  disabled: boolean;
  type: TExtendedEntitiesTypeDict;
};

type EntityTypeOption = {
  group: TEntityGroupValue;
  value: TExtendedEntitiesTypeDict | undefined;
  label: string;
  disabled: boolean;
};

type EntityTypeGroupedOptions = {
  group: string;
  options: Array<EntityTypeOption>;
};

export const EntityWorkflowConfiguration: Partial<
  Record<
    TExtendedEntitiesTypeDict,
    {
      group: TEntityGroupValue;
      label: string;
      properties: Partial<Record<TCategoryValue, EntityTypeProperties>>;
    }
  >
> = {
  [ExtendedEntitiesTypeDict.IonChannelModel]: {
    group: EntityGroupDict.Subcellular,
    label: 'Ion channel',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.IonChannelModel,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.IonChannelModel,
      },
    },
  },
  [ExtendedEntitiesTypeDict.Metabolism]: {
    group: EntityGroupDict.Subcellular,
    label: 'Metabolism',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.Metabolism,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.Metabolism,
      },
    },
  },
  [ExtendedEntitiesTypeDict.NGVUnit]: {
    group: EntityGroupDict.Subcellular,
    label: 'NGV Unit',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.NGVUnit,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.NGVUnit,
      },
    },
  },
  [ExtendedEntitiesTypeDict.Memodel]: {
    group: EntityGroupDict.Cellular,
    label: 'Single neuron',
    properties: {
      build: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.Memodel,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: {
    group: EntityGroupDict.Cellular,
    label: 'Synaptome',
    properties: {
      build: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: {
    group: EntityGroupDict.Cellular,
    label: 'Paired Neurons',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: {
    group: EntityGroupDict.Circuit,
    label: 'Small microcircuit',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.SmallMicrocircuit,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.Microcircuit]: {
    group: EntityGroupDict.Circuit,
    label: 'Microcircuit',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.Microcircuit,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.NGVCircuit]: {
    group: EntityGroupDict.Circuit,
    label: 'NGV Circuit',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.NGVCircuit,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.NGVCircuit,
      },
    },
  },
  [ExtendedEntitiesTypeDict.BrainRegion]: {
    group: EntityGroupDict.System,
    label: 'Brain region',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.BrainRegion,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.BrainRegion,
      },
    },
  },
  [ExtendedEntitiesTypeDict.BrainSystems]: {
    group: EntityGroupDict.System,
    label: 'Brain system',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.BrainSystems,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.BrainSystems,
      },
    },
  },
  [ExtendedEntitiesTypeDict.WholeBrain]: {
    group: EntityGroupDict.System,
    label: 'Whole brain',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.WholeBrain,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.WholeBrain,
      },
    },
  },
} as const;

export type EntityDropdownOption = {
  label: string;
  properties: Partial<Record<TCategoryValue, { disabled: boolean }>>;
};

export type TEntityDropdownOptionsGrouped = Array<{
  group: TEntityGroupValue;
  options: Array<EntityDropdownOption>;
}>;

export function getDropdownOptionsByCategory(category: TCategoryValue): {
  allOptions: Array<EntityTypeGroupedOptions>;
  enabledOptions: Array<EntityTypeGroupedOptions>;
} {
  const options = Object.values(EntityWorkflowConfiguration)
    .filter((config): config is NonNullable<typeof config> => config !== undefined)
    .map((config) => ({
      group: config.group,
      label: config.label,
      value: get(config, `properties.${category}`, undefined)?.type,
      disabled: get(config, `properties.${category}`, undefined)?.disabled ?? true,
    }));

  const grouped = groupBy(options, 'group');

  const allOptions = Object.entries(grouped).map(([group, opts]) => ({
    group: group as TEntityGroupValue,
    options: opts.map(({ label, value, disabled }) => ({
      label,
      value,
      disabled,
      group: group as TEntityGroupValue,
    })),
  }));

  const enabledOptions = Object.entries(grouped)
    .map(([group, opts]) => ({
      group: group as TEntityGroupValue,
      options: opts.map(({ label, value, disabled }) => ({
        label,
        value,
        disabled,
        group: group as TEntityGroupValue,
      })),
    }))
    .filter((g) => g.options.some((opt) => !opt.disabled))
    .map(({ group, options: _options }) => ({
      group,
      options: _options.filter((o) => !o.disabled),
    }));

  return {
    allOptions,
    enabledOptions,
  };
}

export function getAllOptionsOrdered(category: TCategoryValue): Array<EntityTypeOption> {
  const options = Object.values(EntityWorkflowConfiguration)
    .filter((config): config is NonNullable<typeof config> => config !== undefined)
    .map((config) => ({
      group: config.group,
      label: config.label,
      value: get(config, `properties.${category}`, undefined)?.type,
      disabled: get(config, `properties.${category}`, undefined)?.disabled ?? true,
    }));

  return sortBy(options, ['disabled', 'group']);
}

export function getBuildTypeFromSimulateType(
  type: TExtendedEntitiesTypeDict
): TExtendedEntitiesTypeDict | undefined {
  const config = find(
    values(EntityWorkflowConfiguration),
    (c) => c.properties.simulate?.type === type
  );

  return config?.properties.build?.type;
}

export function getWorkflowSegment(url: string): TCategoryValue | null {
  const match = url.match(/\/workflows\/([^/]+)/);
  return match ? (match[1] as TCategoryValue) : null;
}

export function getCategoryDictItem(value: TCategoryValue | null | undefined) {
  if (!value) return null;
  return find(CategoryDict, { value });
}

export function getEntityTypeWorkflowConfigurationItem(
  value: TExtendedEntitiesTypeDict | null | undefined
) {
  if (!value) return null;
  return get(EntityWorkflowConfiguration, `${value}`, null);
}
