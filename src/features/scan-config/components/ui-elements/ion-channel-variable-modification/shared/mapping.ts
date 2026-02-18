export type TMechanismVariableType = 'RANGE' | 'GLOBAL';

export type TSectionList = 'apical' | 'axonal' | 'basal' | 'somatic' | string;

export interface MechanismVariable {
  neuron_variable: string;
  channel_name: string;
  section_list: TSectionList;
  value: number | null;
  units: string;
  limits: [number, number] | null;
  variable_type: TMechanismVariableType;
}

export interface ChannelSectionMapping {
  section_lists: Array<TSectionList>;
  entity_id: string | null;
}

export interface ChannelToSectionLists {
  [channelName: string]: ChannelSectionMapping;
}

export interface ChannelMapping {
  channel_to_section_lists: ChannelToSectionLists;
}

export interface MechanismVariablesRoot {
  MechanismVariables: {
    MechanismVariables: Array<MechanismVariable>;
    ChannelMapping: ChannelMapping;
  };
}
