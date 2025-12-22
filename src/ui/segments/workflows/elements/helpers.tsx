import find from 'es-toolkit/compat/find';
import get from 'es-toolkit/compat/get';
import groupBy from 'es-toolkit/compat/groupBy';
import sortBy from 'es-toolkit/compat/sortBy';
import values from 'es-toolkit/compat/values';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type FeatureFlags, type FlagKey, microcircuitFlag } from '@/features/feature-flags/flags';

export const WorkflowSessionIdSearchParam = 'sessionId';
export const EntityScopeDict = {
  Subcellular: 'Subcellular',
  Cellular: 'Cellular',
  Circuit: 'Circuit',
  System: 'System',
} as const;

export type TEntityScopeValue = keyof typeof EntityScopeDict;

export const ActivityDict = [
  { label: 'Build', value: 'build', disabled: false, name: 'Build' },
  { label: 'Simulate', value: 'simulate', disabled: false, name: 'Simulation' },
  { label: 'Extract', value: 'extract', disabled: true, name: 'Extract' },
  { label: 'Optimize', value: 'optimize', disabled: true, name: 'Optimize' },
  { label: 'Validate', value: 'validate', disabled: true, name: 'Validate' },
  {
    label: 'Process Data',
    value: 'process_data',
    disabled: true,
    name: 'Process Data',
  },
] as const;

export type TActivityValue = (typeof ActivityDict)[number]['value'];
export const ActivityValues = Object.fromEntries(ActivityDict.map((c) => [c.label, c.value])) as {
  [K in (typeof ActivityDict)[number] as K['label']]: K['value'];
};

type EntityTypeProperties = {
  disabled: boolean;
  type: TExtendedEntitiesTypeDict;
  requiredFeatures?: FlagKey[];
};

type EntityTypeOption = {
  group: TEntityScopeValue;
  value: TExtendedEntitiesTypeDict | undefined;
  label: string;
  disabled: boolean;
};

type EntityTypeGroupedOptions = {
  group: string;
  options: EntityTypeOption[];
};

export const EntityWorkflowConfiguration: Partial<
  Record<
    TExtendedEntitiesTypeDict,
    {
      group: TEntityScopeValue;
      label: string;
      properties: Partial<Record<TActivityValue, EntityTypeProperties>>;
      requiredFeatures?: FlagKey[];
    }
  >
> = {
  [ExtendedEntitiesTypeDict.IonChannelModel]: {
    group: EntityScopeDict.Subcellular,
    label: 'Ion channel',
    properties: {
      build: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.IonChannelModel,
      },
      simulate: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.IonChannelModel,
      },
    },
  },
  [ExtendedEntitiesTypeDict.Metabolism]: {
    group: EntityScopeDict.Subcellular,
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
    group: EntityScopeDict.Subcellular,
    label: 'NGV unit',
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
    group: EntityScopeDict.Cellular,
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
    group: EntityScopeDict.Cellular,
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
  [ExtendedEntitiesTypeDict.MemodelCircuit]: {
    group: EntityScopeDict.Cellular,
    label: 'Single neuron (beta)',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.MemodelCircuit,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.SingleNeuronCircuit]: {
    group: EntityScopeDict.Cellular,
    label: 'Synaptome (beta)',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: {
    group: EntityScopeDict.Circuit,
    label: 'Paired neurons (beta)',
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
    group: EntityScopeDict.Circuit,
    label: 'Small microcircuit (beta)',
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
    group: EntityScopeDict.Circuit,
    label: 'Microcircuit',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.Microcircuit,
      },
      simulate: {
        disabled: false,
        requiredFeatures: [microcircuitFlag.key],
        type: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
      },
    },
  },
  [ExtendedEntitiesTypeDict.NGVCircuit]: {
    group: EntityScopeDict.Circuit,
    label: 'NGV circuit',
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
    group: EntityScopeDict.System,
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
    group: EntityScopeDict.System,
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
    group: EntityScopeDict.System,
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
  properties: Partial<Record<TActivityValue, { disabled: boolean }>>;
};

export type TEntityDropdownOptionsGrouped = Array<{
  group: TEntityScopeValue;
  options: EntityDropdownOption[];
}>;

export function getDropdownOptionsByCategory(
  category: TActivityValue,
  featureFlags?: FeatureFlags
): {
  allOptions: EntityTypeGroupedOptions[];
  enabledOptions: EntityTypeGroupedOptions[];
} {
  const options = Object.values(EntityWorkflowConfiguration)
    .filter((config): config is NonNullable<typeof config> => config !== undefined)
    .filter(
      (config) =>
        !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
    )
    .map((config) => {
      const disabled = get(config, `properties.${category}`, undefined)?.disabled ?? true;
      const requiredFeatures = config.properties[category]?.requiredFeatures;
      const satisfiesFeatureRequirements =
        !requiredFeatures || requiredFeatures.every((flag) => featureFlags?.[flag]);

      return {
        group: config.group,
        label: config.label,
        value: get(config, `properties.${category}`, undefined)?.type,
        disabled: disabled || !satisfiesFeatureRequirements,
      };
    });

  const grouped = groupBy(options, 'group');

  const allOptions = Object.entries(grouped).map(([group, opts]) => ({
    group: group as TEntityScopeValue,
    options: opts.map(({ label, value, disabled }) => ({
      label,
      value,
      disabled,
      group: group as TEntityScopeValue,
    })),
  }));

  const enabledOptions = Object.entries(grouped)
    .map(([group, opts]) => ({
      group: group as TEntityScopeValue,
      options: opts.map(({ label, value, disabled }) => ({
        label,
        value,
        disabled,
        group: group as TEntityScopeValue,
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

export function getAllOptionsOrdered(
  category: TActivityValue,
  featureFlags: FeatureFlags
): EntityTypeOption[] {
  const options = Object.values(EntityWorkflowConfiguration)
    .filter((config): config is NonNullable<typeof config> => config !== undefined)
    .filter(
      (config) =>
        !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
    )
    .map((config) => {
      const disabled = get(config, `properties.${category}`, undefined)?.disabled ?? true;
      const requiredFeatures = config.properties[category]?.requiredFeatures;
      const satisfiesFeatureRequirements =
        !requiredFeatures || requiredFeatures.every((flag) => featureFlags?.[flag]);

      return {
        group: config.group,
        label: config.label,
        value: get(config, `properties.${category}`, undefined)?.type,
        disabled: disabled || !satisfiesFeatureRequirements,
      };
    });

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

export function getWorkflowSegment(url: string): TActivityValue | null {
  const match = url.match(/\/workflows\/([^/]+)/);
  return match ? (match[1] as TActivityValue) : null;
}

export function getCategoryDictItem(value: TActivityValue | null | undefined) {
  if (!value) return null;
  return find(ActivityDict, { value });
}

export function getEntityTypeWorkflowConfigurationItem(
  value: TExtendedEntitiesTypeDict | null | undefined
) {
  if (!value) return null;
  return get(EntityWorkflowConfiguration, `${value}`, null);
}
