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
  type MechanismVariablesRoot,
  MechanismVariableTypeDict,
  type SectionListEntry,
  toSectionValue,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/mapping';
import { ModificationShell } from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/modification-shell';
import {
  type IonChannelSelection,
  IonChannelVariableSelector,
} from '@/features/scan-config/components/ui-elements/ion-channel-variable-modification/shared/selector';
import { type ConfigValue, ScanConfigUIElementDict } from '@/features/scan-config/types';

export interface GlobalModificationBaseProps {
  data: MechanismVariablesRoot | null;
  disabled: boolean;
  value: ConfigValue | undefined;
  onChange: (next: ConfigValue) => void;
  modificationType: string;
  errorPathPrefix?: string;
  /** Whether mechanism variables are still loading. */
  loading?: boolean;
  /** Status note when the picker is unavailable (error / empty). */
  reason?: ReactNode | null;
}

/**
 * Presentational UI for `ion_channel_variable_modification_by_neuron`.
 *
 * Does not fetch data; MEModel/Circuit wrappers supply {@link MechanismVariablesRoot}.
 *
 * @param props - Mechanism variables plus form field wiring and optional gating state.
 */
export function GlobalModificationBase({
  data,
  disabled,
  value: currentModification,
  onChange,
  modificationType,
  errorPathPrefix,
  loading = false,
  reason = null,
}: GlobalModificationBaseProps) {
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

  const newValue: SectionValue = useMemo(
    () => (isValidModification ? toSectionValue(currentModification.new_value) : null),
    [isValidModification, currentModification]
  );

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
    return { [sectionLabel]: newValue };
  }, [isValidModification, newValue, sectionLabel]);

  const handleVariableChange = (selection: IonChannelSelection) => {
    onChange({
      type: modificationType,
      ion_channel_id: selection.entityId,
      channel_name: selection.channelName,
      variable_name: selection.variable.neuron_variable,
      variable_type: selection.variable.variable_type,
    });
  };

  const handleSectionChange = (_sectionList: string, value: SectionValue) => {
    if (!isValidModification) return;
    onChange({ ...currentModification, new_value: value });
  };

  return (
    <ModificationShell
      uiElement={ScanConfigUIElementDict.IonChannelVariableModificationByNeuron}
      data={data}
      loading={loading}
      reason={reason}
    >
      <IonChannelVariableSelector
        data={data ?? {}}
        variableType={[MechanismVariableTypeDict.Global, MechanismVariableTypeDict.Range]}
        value={currentValue}
        onChange={handleVariableChange}
        disabled={disabled}
      />

      {resolvedVariable && editorSectionLists.length > 0 && (
        <SectionListConfigEditor
          uiElement={ScanConfigUIElementDict.IonChannelVariableModificationByNeuron}
          sectionLists={editorSectionLists}
          values={editorValues}
          onChange={handleSectionChange}
          disabled={disabled}
          errorPathPrefix={errorPathPrefix}
        />
      )}
    </ModificationShell>
  );
}
