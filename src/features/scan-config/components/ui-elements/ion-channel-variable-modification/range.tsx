'use client';

import { useMemo } from 'react';

import {
  SectionListConfigEditor,
  type SectionValue,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/editor';
import {
  buildChannelGroups,
  type ChannelVariableOption,
  decodeSelectionValue,
  encodeSelectionValue,
  findChannelNameByEntityId,
  findChannelNameByVariable,
  type MechanismVariablesRoot,
  MechanismVariableTypeDict,
  type SectionListEntry,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import {
  type IonChannelSelection,
  IonChannelVariableSelector,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/selector';
import {
  type ConfigValue,
  ScanConfigUIElementDict,
  type SetAtom,
} from '@/features/scan-config/types';

import type { SetStateAction } from 'jotai';

interface RangeProps {
  data: MechanismVariablesRoot | null;
  disabled: boolean;
  state: Record<string, ConfigValue>;
  setState: SetAtom<[SetStateAction<Record<string, ConfigValue>>], void>;
  fieldKey: string;
  modificationType: string;
  errorPathPrefix?: string;
}

export function Range({
  data,
  disabled,
  state,
  setState,
  fieldKey,
  modificationType,
  errorPathPrefix,
}: RangeProps) {
  const currentModification = state[fieldKey];
  const isValidModification =
    !!currentModification &&
    typeof currentModification === 'object' &&
    !Array.isArray(currentModification);

  const currentValue = useMemo(() => {
    if (!isValidModification || !data || typeof currentModification.variable_name !== 'string')
      return null;

    const variableName = currentModification.variable_name as string;
    const ionChannelId = currentModification.ion_channel_id;

    // resolve channel name: try entity_id lookup first, fall back to variable name lookup
    let channelName: string | null = null;
    if (typeof ionChannelId === 'string' && ionChannelId !== '') {
      channelName = findChannelNameByEntityId(data, ionChannelId);
    }
    if (!channelName) {
      channelName = findChannelNameByVariable(data, variableName);
    }
    if (!channelName) return null;
    return encodeSelectionValue(channelName, variableName);
  }, [isValidModification, currentModification, data]);

  const channelGroups = useMemo(
    () => (data ? buildChannelGroups(data, MechanismVariableTypeDict.Range) : []),
    [data]
  );

  const resolvedVariable: ChannelVariableOption | null = useMemo(() => {
    if (!currentValue) return null;
    const { channelName, variableName } = decodeSelectionValue(currentValue);
    const group = channelGroups.find((g) => g.channel_name === channelName);
    return group?.variables.find((v) => v.neuron_variable === variableName) ?? null;
  }, [currentValue, channelGroups]);

  const sectionValues: Record<string, SectionValue> = useMemo(() => {
    if (
      !isValidModification ||
      !currentModification.section_list_modifications ||
      typeof currentModification.section_list_modifications !== 'object'
    )
      return {};

    const mods = currentModification.section_list_modifications as Record<string, ConfigValue>;
    const result: Record<string, SectionValue> = {};
    for (const [key, val] of Object.entries(mods)) {
      if (typeof val === 'number') result[key] = val;
      // TODO: re-enable array support when multi-value sweep when enabled in obi-one
      // else if (Array.isArray(val) && val.every((v) => typeof v === 'number'))
      //   result[key] = val as number[];
    }
    return result;
  }, [isValidModification, currentModification]);

  const sectionListsWithDefaults: SectionListEntry[] = useMemo(() => {
    if (!resolvedVariable) return [];
    return resolvedVariable.section_lists;
  }, [resolvedVariable]);

  if (!data) return null;

  const handleVariableChange = (selection: IonChannelSelection) => {
    const sectionListModifications: Record<string, number> = {};
    for (const entry of selection.variable.section_lists) {
      if (entry.value !== null) {
        sectionListModifications[entry.section_list] = entry.value;
      }
    }

    setState({
      ...state,
      [fieldKey]: {
        type: modificationType,
        ion_channel_id: selection.entityId,
        variable_name: selection.variable.neuron_variable,
        section_list_modifications: sectionListModifications,
      },
    });
  };

  const handleSectionChange = (sectionList: string, value: SectionValue) => {
    if (!isValidModification) return;

    const currentMods =
      (currentModification.section_list_modifications as Record<string, ConfigValue>) ?? {};

    setState({
      ...state,
      [fieldKey]: {
        ...currentModification,
        section_list_modifications: {
          ...currentMods,
          [sectionList]: value,
        },
      },
    });
  };

  return (
    <div
      data-scan-config-block-element={
        ScanConfigUIElementDict.ionChannelVariableModificationBySectionList
      }
    >
      <IonChannelVariableSelector
        data={data}
        variableType={MechanismVariableTypeDict.Range}
        value={currentValue}
        onChange={handleVariableChange}
        disabled={disabled}
      />

      {resolvedVariable && sectionListsWithDefaults.length > 0 && (
        <SectionListConfigEditor
          uiElement={ScanConfigUIElementDict.ionChannelVariableModificationBySectionList}
          sectionLists={sectionListsWithDefaults}
          values={sectionValues}
          onChange={handleSectionChange}
          disabled={disabled}
          errorPathPrefix={errorPathPrefix}
        />
      )}
    </div>
  );
}
