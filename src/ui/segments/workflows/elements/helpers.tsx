import { includes } from 'es-toolkit/compat';
import find from 'es-toolkit/compat/find';
import get from 'es-toolkit/compat/get';
import groupBy from 'es-toolkit/compat/groupBy';
import sortBy from 'es-toolkit/compat/sortBy';
import values from 'es-toolkit/compat/values';
import { match, P } from 'ts-pattern';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { type TWorkspaceSection, WorkflowActivityDictValue, WorkspaceSection } from '@/constants';
import {
  extractionActivityFlag,
  type FeatureFlags,
  type FlagKey,
} from '@/features/feature-flags/flags';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

export const WorkflowSessionIdSearchParam = 'sessionId';
export const EntityGroupDict = {
  Subcellular: 'Subcellular',
  Cellular: 'Cellular',
  Circuit: 'Circuit',
  System: 'System',
} as const;

export type TEntityGroupValue = keyof typeof EntityGroupDict;

type TEntityTypeProperties = {
  order?: number;
  label?: string;
  disabled: boolean;
  sourceType?: TExtendedEntitiesTypeDict;
  type: TExtendedEntitiesTypeDict;
  requiredFeatures?: Array<FlagKey>;
};

type EntityTypeOption = {
  group: TEntityGroupValue;
  value: TExtendedEntitiesTypeDict | undefined;
  label: string;
  disabled: boolean;
  order?: number;
};

type EntityTypeGroupedOptions = {
  group: string;
  options: Array<EntityTypeOption>;
};

type TBuildSimulateWorkflowConfigProperties = {
  group: TEntityGroupValue;
  label: string;
  properties: {
    build?: TEntityTypeProperties;
    simulate?: TEntityTypeProperties;
  };
  requiredFeatures?: Array<FlagKey>;
};

type TBuildSimulateWorkflowConfig = Record<
  TExtendedEntitiesTypeDict,
  TBuildSimulateWorkflowConfigProperties
>;

export type TExtractWorkflowConfig = {
  group: TEntityGroupValue;
  value: TExtendedEntitiesTypeDict;
  label: string;
  disabled: boolean;
  properties?: null;
  requiredFeatures?: Array<FlagKey>;
};

export type TProcessWorkflowConfig = {
  group: TEntityGroupValue;
  value: TExtendedEntitiesTypeDict;
  label: string;
  disabled: boolean;
};

export const buildAndSimulateConfiguration: Partial<TBuildSimulateWorkflowConfig> = {
  [ExtendedEntitiesTypeDict.IonChannelModel]: {
    group: EntityGroupDict.Subcellular,
    label: 'Ion channel',
    properties: {
      build: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
        order: 3,
      },
      simulate: {
        label: 'Ion channel (beta)',
        disabled: false,
        sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
        type: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
        order: 3,
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
    group: EntityGroupDict.Cellular,
    label: 'Single neuron',
    properties: {
      build: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.Memodel,
        order: 1,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
        order: 1,
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
        order: 2,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
        order: 2,
      },
    },
  },
  [ExtendedEntitiesTypeDict.MemodelCircuit]: {
    group: EntityGroupDict.Cellular,
    label: 'Single neuron (beta)',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.MemodelCircuit,
        order: 4,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
        order: 4,
      },
    },
  },
  [ExtendedEntitiesTypeDict.SingleNeuronCircuit]: {
    group: EntityGroupDict.Cellular,
    label: 'Synaptome (beta)',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
        order: 5,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
        order: 5,
      },
    },
  },
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: {
    group: EntityGroupDict.Circuit,
    label: 'Paired neurons (beta)',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
        order: 6,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
        order: 6,
      },
    },
  },
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: {
    group: EntityGroupDict.Circuit,
    label: 'Small microcircuit (beta)',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.SmallMicrocircuit,
        order: 7,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
        order: 7,
      },
    },
  },
  [ExtendedEntitiesTypeDict.Microcircuit]: {
    group: EntityGroupDict.Circuit,
    label: 'Microcircuit (beta)',
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
    group: EntityGroupDict.System,
    label: 'Brain region',
    properties: {
      build: {
        disabled: true,
        type: ExtendedEntitiesTypeDict.Circuit,
      },
      simulate: {
        disabled: false,
        type: ExtendedEntitiesTypeDict.BrainRegion,
        sourceType: ExtendedEntitiesTypeDict.Circuit,
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

export const extractNewConfiguration: Array<TExtractWorkflowConfig> = [
  {
    group: EntityGroupDict.Circuit,
    disabled: false,
    label: 'Circuit (beta)',
    value: ExtendedEntitiesTypeDict.Circuit,
    requiredFeatures: [extractionActivityFlag.key],
  },
] as const;

export const extractActivitiesConfiguration: Array<TExtractWorkflowConfig> = [
  {
    group: EntityGroupDict.Circuit,
    disabled: false,
    label: 'Circuit (beta)',
    value: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    requiredFeatures: [extractionActivityFlag.key],
  },
] as const;

export const processNewConfiguration: Array<TProcessWorkflowConfig> = [
  {
    group: EntityGroupDict.Cellular,
    disabled: false,
    label: 'EM mesh skeletonization',
    value: ExtendedEntitiesTypeDict.EMCellMesh,
  },
] as const;

export const processActivitiesConfiguration: Array<TProcessWorkflowConfig> = [
  {
    group: EntityGroupDict.Cellular,
    disabled: false,
    label: 'EM mesh skeletonization',
    value: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
  },
] as const;

type ActivityConfigType =
  | {
      configType: 'buildSimulate';
      config: Partial<TBuildSimulateWorkflowConfig>;
    }
  | { configType: 'extract'; config: Array<TExtractWorkflowConfig> }
  | { configType: 'process'; config: Array<TProcessWorkflowConfig> }
  | { configType: 'none'; config: null };

type ActivityDictEntry = {
  label: string;
  value: string;
  disabled: boolean;
  name: string;
  requiredFeatures?: Array<FlagKey>;
} & ActivityConfigType;

export const ActivityDict: readonly ActivityDictEntry[] = [
  {
    label: 'Build',
    value: WorkflowActivityDictValue.build,
    disabled: false,
    name: 'build',
    configType: 'buildSimulate',
    config: buildAndSimulateConfiguration,
  },
  {
    label: 'Simulate',
    value: WorkflowActivityDictValue.simulate,
    disabled: false,
    name: 'simulation',
    configType: 'buildSimulate',
    config: buildAndSimulateConfiguration,
  },
  {
    label: 'Extract',
    value: WorkflowActivityDictValue.extract,
    disabled: false,
    name: 'extraction',
    configType: 'extract',
    config: extractNewConfiguration,
    requiredFeatures: [extractionActivityFlag.key],
  },
  {
    label: 'Optimize',
    value: WorkflowActivityDictValue.optimize,
    disabled: true,
    name: 'optimization',
    configType: 'none',
    config: null,
  },
  {
    label: 'Validate',
    value: WorkflowActivityDictValue.validate,
    disabled: true,
    name: 'validation',
    configType: 'none',
    config: null,
  },
  {
    label: 'Process data',
    value: WorkflowActivityDictValue.process,
    disabled: false,
    name: 'data processing',
    configType: 'process',
    config: processNewConfiguration,
  },
] as const;

export type TActivityValue =
  (typeof WorkflowActivityDictValue)[keyof typeof WorkflowActivityDictValue];
export const ActivityValues = Object.fromEntries(ActivityDict.map((c) => [c.label, c.value])) as {
  [K in (typeof ActivityDict)[number] as K['label']]: K['value'];
};

export type EntityDropdownOption = {
  label: string;
  properties: Partial<Record<TActivityValue, { disabled: boolean }>>;
};

export type TEntityDropdownOptionsGrouped = Array<{
  group: TEntityGroupValue;
  options: Array<EntityDropdownOption>;
}>;

export function getDropdownOptionsByCategory(
  category: TActivityValue,
  featureFlags?: FeatureFlags
): {
  allOptions: Array<EntityTypeGroupedOptions>;
  enabledOptions: Array<EntityTypeGroupedOptions>;
} {
  if (
    !ActivityDict.filter((o) => !o.disabled)
      .map((o) => o.value)
      .includes(category)
  ) {
    return { allOptions: [], enabledOptions: [] };
  }
  if (category === WorkflowActivityDictValue.extract) {
    const flaggedConfigs = extractActivitiesConfiguration.map((config) => {
      const satisfiesFeatureRequirements =
        !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag]);
      return {
        ...config,
        disabled: config.disabled || !satisfiesFeatureRequirements,
      };
    });
    const grouped = groupBy(flaggedConfigs, 'group');
    const options = Object.entries(grouped).map(([k, v]) => {
      return {
        group: k,
        options: v,
      };
    });

    const enabledOptions = options.filter((o) => o.options.some((a) => !a.disabled));

    return { allOptions: options, enabledOptions };
  }
  if (category === WorkflowActivityDictValue.process) {
    const grouped = groupBy(processActivitiesConfiguration, 'group');
    const options = Object.entries(grouped).map(([k, v]) => {
      return {
        group: k,
        options: v,
      };
    });

    const enabledOptions = options.filter((o) => o.options.some((a) => !a.disabled));

    return { allOptions: options, enabledOptions };
  }
  if (includes([WorkflowActivityDictValue.build, WorkflowActivityDictValue.simulate], category)) {
    const activityKey = category as 'build' | 'simulate';
    const options = Object.values(buildAndSimulateConfiguration)
      .filter((config): config is NonNullable<typeof config> => config !== undefined)
      .filter(
        (config) =>
          !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
      )
      .map((config) => {
        const propertyConfig = config.properties[activityKey];
        const disabled = propertyConfig?.disabled ?? true;
        const requiredFeatures = propertyConfig?.requiredFeatures;
        const satisfiesFeatureRequirements =
          !requiredFeatures || requiredFeatures.every((flag) => featureFlags?.[flag]);

        return {
          group: config.group,
          label: propertyConfig?.label ?? config.label,
          value: propertyConfig?.type,
          disabled: disabled || !satisfiesFeatureRequirements,
        };
      });

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

  return { allOptions: [], enabledOptions: [] };
}

export function getAllOptionsOrdered(
  category: TActivityValue,
  featureFlags: FeatureFlags
): Array<EntityTypeOption> {
  if (
    !ActivityDict.filter((o) => !o.disabled)
      .map((o) => o.value)
      .includes(category)
  ) {
    return [];
  }

  if (category === WorkflowActivityDictValue.extract) {
    return extractNewConfiguration.map((config) => {
      const satisfiesFeatureRequirements =
        !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag]);
      return {
        ...config,
        disabled: config.disabled || !satisfiesFeatureRequirements,
      };
    });
  }

  if (category === WorkflowActivityDictValue.process) {
    return processNewConfiguration;
  }

  if (includes([WorkflowActivityDictValue.build, WorkflowActivityDictValue.simulate], category)) {
    const activityKey = category as 'build' | 'simulate';
    const options = Object.values(buildAndSimulateConfiguration)
      .filter((config): config is NonNullable<typeof config> => config !== undefined)
      .filter(
        (config) =>
          !config.requiredFeatures || config.requiredFeatures.every((flag) => featureFlags?.[flag])
      )
      .map((config) => {
        const propertyConfig = config.properties[activityKey];
        const disabled = propertyConfig?.disabled ?? true;
        const requiredFeatures = propertyConfig?.requiredFeatures;
        const satisfiesFeatureRequirements =
          !requiredFeatures || requiredFeatures.every((flag) => featureFlags?.[flag]);

        return {
          group: config.group,
          label: propertyConfig?.label ?? config.label,
          value: propertyConfig?.type,
          disabled: disabled || !satisfiesFeatureRequirements,
          order: propertyConfig?.order ?? Number.MAX_SAFE_INTEGER,
        };
      });

    return sortBy(options, [
      (o) => (o.disabled ? 1 : 0),
      (o) => o.order ?? Number.MAX_SAFE_INTEGER,
    ]);
  }

  return [];
}

export function getWorkflowSegment(url: string): TActivityValue | null {
  const match = url.match(/\/workflows\/([^/]+)/);
  return match ? (match[1] as TActivityValue) : null;
}

export function getCategoryDictItem(value: TActivityValue | null | undefined) {
  if (!value) return null;
  return find(ActivityDict, { value });
}

export function getEntityTypeWorkflowConfigurationItem({
  value,
  section,
}: {
  value: TExtendedEntitiesTypeDict | null | undefined;
  section: TWorkspaceSection;
}) {
  return match({ section, value })
    .with({ section: WorkspaceSection.ExtractWorkflow, value: P.nonNullable }, () =>
      extractNewConfiguration.find((o) => o.value === value)
    )
    .with({ section: WorkspaceSection.ProcessWorkflow, value: P.nonNullable }, () =>
      processNewConfiguration.find((o) => o.value === value)
    )
    .with(
      {
        section: P.union(WorkspaceSection.BuildWorkflow, WorkspaceSection.SimulateWorkflow),
        value: P.nonNullable,
      },
      () => {
        return get(buildAndSimulateConfiguration, `${value}`, null);
      }
    )
    .otherwise(() => null);
}

export function getBaseModelTypeFromActivityType({
  type,
  section,
}: {
  type: TExtendedEntitiesTypeDict;
  section: TWorkspaceSection;
}): TExtendedEntitiesTypeDict | undefined {
  return match({ section, type })
    .with(
      { section: WorkspaceSection.ExtractWorkflow, type: P.nonNullable },
      () => extractNewConfiguration.find((p) => p.value === type)?.value
    )
    .with(
      { section: WorkspaceSection.ProcessWorkflow, type: P.nonNullable },
      () => processNewConfiguration.find((p) => p.value === type)?.value
    )
    .with(
      {
        section: P.union(WorkspaceSection.BuildWorkflow, WorkspaceSection.SimulateWorkflow),
        type: P.nonNullable,
      },
      ({ section: workflowSection }) => {
        const activityKey = workflowSection as 'build' | 'simulate';
        const config = find(values(buildAndSimulateConfiguration), (c) => {
          return c?.properties[activityKey]?.type === type;
        });

        return config?.properties.build?.type;
      }
    )
    .otherwise(() => undefined);
}

export const getSourceTypeByActivityAndType = (
  activity: TActivityValue,
  type: TExtendedEntitiesTypeDict
) => {
  const config = ActivityDict.find((a) => a.value === activity)?.config;
  if (!config || Array.isArray(config)) return undefined;
  const activityKey = activity as 'build' | 'simulate';

  return find(values(config), (c) => {
    const props = c?.properties[activityKey];
    return props?.type === type;
  })?.properties[activityKey]?.sourceType;
};

export const getTypeByActivityAndSourceType = (
  activity: TActivityValue,
  sourceType: TExtendedEntitiesTypeDict
) => {
  const config = ActivityDict.find((a) => a.value === activity)?.config;
  if (!config || Array.isArray(config)) return undefined;
  const activityKey = activity as 'build' | 'simulate';

  return find(values(config), (c) => {
    const props = c?.properties[activityKey];
    return props?.sourceType === sourceType;
  })?.properties[activityKey]?.type;
};
