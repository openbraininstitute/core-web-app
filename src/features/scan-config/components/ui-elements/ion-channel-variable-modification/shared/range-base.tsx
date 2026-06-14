'use client';

import { type ReactNode, useMemo } from 'react';

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
import { ModificationShell } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/modification-shell';
import {
  type IonChannelSelection,
  IonChannelVariableSelector,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/selector';
import { type ConfigValue, ScanConfigUIElementDict } from '@/features/scan-config/types';

export interface RangeModificationBaseProps {
  data: MechanismVariablesRoot | null;
  disabled: boolean;
  state: Record<string, ConfigValue>;
  setState: (newState: Record<string, ConfigValue>) => void;
  fieldKey: string;
  modificationType: string;
  errorPathPrefix?: string;
  /** circuit variant: variables are being fetched for the selected neuron set */
  loading?: boolean;
  /** circuit variant: rendered note for why the picker is unavailable (error, no variables) */
  reason?: ReactNode | null;
}

/**
 * presentational base for the "Variable Modification by Section List"
 * (`ion_channel_variable_modification_by_section_list`) ui element.
 *
 * renders the channel/variable picker and a per-section-list value editor from a
 * provided {@link MechanismVariablesRoot}. it does not fetch data; the me-model
 * and circuit wrappers each supply data (and, for circuit, loading/emptyReason respectively).
 */
export function RangeModificationBase({
  data,
  disabled,
  state,
  setState,
  fieldKey,
  modificationType,
  errorPathPrefix,
  loading = false,
  reason = null,
}: RangeModificationBaseProps) {
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
    <ModificationShell
      uiElement={ScanConfigUIElementDict.ionChannelVariableModificationBySectionList}
      data={data}
      loading={loading}
      reason={reason}
    >
      <IonChannelVariableSelector
        data={data ?? {}}
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
    </ModificationShell>
  );
}
