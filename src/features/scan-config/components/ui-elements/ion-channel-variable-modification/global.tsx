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
  type MechanismVariablesRoot,
  MechanismVariableTypeDict,
  type SectionListEntry,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import {
  type IonChannelSelection,
  IonChannelVariableSelector,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/selector';

import type { SetStateAction } from 'jotai';
import type { ConfigValue } from '@/features/scan-config/types';

type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

interface GlobalProps {
  data: MechanismVariablesRoot | null;
  disabled: boolean;
  state: Record<string, ConfigValue>;
  setState: SetAtom<[SetStateAction<Record<string, ConfigValue>>], void>;
  fieldKey: string;
  modificationType: string;
}

export function Global({
  data,
  disabled,
  state,
  setState,
  fieldKey,
  modificationType,
}: GlobalProps) {
  const currentModification = state[fieldKey];
  const isValidModification =
    !!currentModification &&
    typeof currentModification === 'object' &&
    !Array.isArray(currentModification);

  const currentValue = useMemo(() => {
    if (
      !isValidModification ||
      typeof currentModification.channel_name !== 'string' ||
      typeof currentModification.variable_name !== 'string'
    )
      return null;
    return encodeSelectionValue(
      currentModification.channel_name,
      currentModification.variable_name
    );
  }, [isValidModification, currentModification]);

  const channelGroups = useMemo(
    () =>
      data
        ? buildChannelGroups(data, [
            MechanismVariableTypeDict.Global,
            MechanismVariableTypeDict.Range,
          ])
        : [],
    [data]
  );

  const resolvedVariable: ChannelVariableOption | null = useMemo(() => {
    if (!currentValue) return null;
    const { channelName, variableName } = decodeSelectionValue(currentValue);
    const group = channelGroups.find((g) => g.channel_name === channelName);
    return group?.variables.find((v) => v.neuron_variable === variableName) ?? null;
  }, [currentValue, channelGroups]);

  const newValue: number | null = useMemo(() => {
    if (!isValidModification) return null;
    const v = currentModification.new_value;
    if (typeof v === 'number') return v;
    // TODO: re-enable array support when multi-value sweep when supported in obi-one
    // if (Array.isArray(v) && v.every((x) => typeof x === 'number')) return v as number[];
    return null;
  }, [isValidModification, currentModification]);

  const sectionLabel = useMemo(
    () =>
      resolvedVariable ? resolvedVariable.section_lists.map((s) => s.section_list).join(', ') : '',
    [resolvedVariable]
  );

  const editorSectionLists: SectionListEntry[] = useMemo(() => {
    if (!resolvedVariable || !sectionLabel) return [];
    const first = resolvedVariable.section_lists[0];
    return [
      {
        section_list: sectionLabel,
        value: null,
        limits: first?.limits ?? null,
        units: first?.units ?? '',
      },
    ];
  }, [resolvedVariable, sectionLabel]);

  const editorValues: Record<string, SectionValue> = useMemo(() => {
    if (!isValidModification || !sectionLabel) return {};
    if (newValue === null) return {};
    return { [sectionLabel]: newValue };
  }, [isValidModification, newValue, sectionLabel]);

  if (!data) return null;

  const handleVariableChange = (selection: IonChannelSelection) => {
    setState({
      ...state,
      [fieldKey]: {
        type: modificationType,
        ion_channel_id: selection.entityId,
        channel_name: selection.channelName,
        variable_name: selection.variable.neuron_variable,
      },
    });
  };

  const handleSectionChange = (_sectionList: string, value: SectionValue) => {
    if (!isValidModification) return;
    setState({
      ...state,
      [fieldKey]: { ...currentModification, new_value: value },
    });
  };

  return (
    <div>
      <IonChannelVariableSelector
        data={data}
        variableType={[MechanismVariableTypeDict.Global, MechanismVariableTypeDict.Range]}
        value={currentValue}
        onChange={handleVariableChange}
        disabled={disabled}
      />

      {resolvedVariable && editorSectionLists.length > 0 && (
        <SectionListConfigEditor
          sectionLists={editorSectionLists}
          values={editorValues}
          onChange={handleSectionChange}
          disabled={disabled}
        />
      )}
    </div>
  );
}
