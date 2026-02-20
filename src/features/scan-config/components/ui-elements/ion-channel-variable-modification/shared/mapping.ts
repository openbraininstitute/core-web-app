export const MechanismVariableTypeDict = {
  Range: 'RANGE',
  Global: 'GLOBAL',
} as const;

export type TMechanismVariableType =
  (typeof MechanismVariableTypeDict)[keyof typeof MechanismVariableTypeDict];

export type TSectionList = 'apical' | 'axonal' | 'basal' | 'somatic' | string;
export const RootSelector = 'MechanismVariablesByIonChannel';
export interface VariableEntry {
  units: string;
  limits: [number, number] | null;
  variable_type: TMechanismVariableType;
  section_lists_original_values: Record<TSectionList, number | null>;
}

export interface ChannelEntry {
  section_lists: TSectionList[];
  entity_id: string | null;
  variables: Record<string, VariableEntry>;
}

export type MechanismVariablesRoot = Record<string, ChannelEntry>;

export interface SectionListEntry {
  section_list: TSectionList;
  value: number | null;
  limits: [number, number] | null;
  units: string;
}

export interface ChannelVariableOption {
  neuron_variable: string;
  variable_type: TMechanismVariableType;
  section_lists: SectionListEntry[];
}

export interface ChannelGroupOption {
  channel_name: string;
  section_lists: TSectionList[];
  entity_id: string | null;
  variables: ChannelVariableOption[];
}

/**
 * transforms `MechanismVariablesByIonChannel` data into dropdown-ready
 * channel groups, filtered by variable_type.
 */
export function buildChannelGroups(
  data: MechanismVariablesRoot,
  variableType: TMechanismVariableType | TMechanismVariableType[]
): ChannelGroupOption[] {
  const types = Array.isArray(variableType) ? variableType : [variableType];
  const typeSet = new Set(types);
  const groups: ChannelGroupOption[] = [];

  for (const [channelName, channel] of Object.entries(data)) {
    const variables: ChannelVariableOption[] = [];

    for (const [varName, varEntry] of Object.entries(channel.variables)) {
      if (!typeSet.has(varEntry.variable_type)) continue;

      const sectionLists: SectionListEntry[] = Object.entries(
        varEntry.section_lists_original_values
      ).map(([sectionList, value]) => ({
        section_list: sectionList,
        value,
        limits: varEntry.limits,
        units: varEntry.units,
      }));

      variables.push({
        neuron_variable: varName,
        variable_type: varEntry.variable_type,
        section_lists: sectionLists,
      });
    }

    if (variables.length > 0) {
      groups.push({
        channel_name: channelName,
        section_lists: channel.section_lists,
        entity_id: channel.entity_id,
        variables,
      });
    }
  }

  return groups;
}

/** reverse-lookup: find the channel_name key whose entity_id matches */
export function findChannelNameByEntityId(
  data: MechanismVariablesRoot,
  entityId: string
): string | null {
  for (const [channelName, channel] of Object.entries(data)) {
    if (channel.entity_id === entityId) return channelName;
  }
  return null;
}

const SEPARATOR = '::';

/** channel + variable pair into a single string value for the Select */
export function encodeSelectionValue(channelName: string, variableName: string): string {
  return `${channelName}${SEPARATOR}${variableName}`;
}

/** selection value back into channel + variable */
export function decodeSelectionValue(value: string): {
  channelName: string;
  variableName: string;
} {
  const idx = value.indexOf(SEPARATOR);
  return {
    channelName: value.slice(0, idx),
    variableName: value.slice(idx + SEPARATOR.length),
  };
}
