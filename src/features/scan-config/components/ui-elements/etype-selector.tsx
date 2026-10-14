'use client';

/**
 * `etype_selector` — pick one e-type from entitycore's `/etype` taxonomy.
 *
 * Unlike `model_selector_single` / `task_result_selector`, an e-type is not a grid-browsable
 * entity: it is a searchable taxonomy item. So this uses the async search dropdown
 * ({@link AsyncSelect}) rather than the browse-table widget, and needs none of the FromID
 * registry / resolve machinery. It stores the ObiOne FromID ref shape the schema declares
 * (`{ id_str, type: 'ETypeClassFromID' }`) so the config payload matches the backend contract.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { getEtype, getEtypes } from '@/api/entitycore/queries/annotations/etype';
import { isFromIdRef } from '@/features/scan-config/helpers';
import { type ConfigValue, ScanConfigUIElementDict } from '@/features/scan-config/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { AsyncSelect } from '@/ui/molecules/async-select';
import { type FancyChrome, FancyField } from '@/ui/molecules/fancy-input';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { IEType, IETypeFilter } from '@/api/entitycore/types/shared/global';

interface Props {
  disabled?: boolean;
  value?: ConfigValue;
  state: Record<string, ConfigValue>;
  fieldKey: string;
  onChange: (newState: Record<string, ConfigValue>) => void;
  /** the schema field's stored FromID `type` const, e.g. `ETypeClassFromID` */
  valueType?: string;
}

export function ETypeSelector({
  disabled,
  value,
  state,
  fieldKey,
  onChange,
  valueType,
  chrome,
}: Props & { chrome?: FancyChrome }) {
  const { virtualLabId, projectId } = useWorkspace();

  const selectedRef = isFromIdRef(value) ? value : null;
  const selectedId = selectedRef?.id_str;

  // resolve the stored id to a label on load, so the trigger shows the e-type name
  // even before the user opens the dropdown
  const { data: selectedEtype } = useQuery({
    queryKey: [...keyBuilder.etype({ virtualLabId, projectId }), 'by-id', selectedId],
    queryFn: () => getEtype({ id: selectedId as string }),
    enabled: !!selectedId,
    staleTime: 86_400_000,
  });

  const queryFn = useCallback(
    ({ filters }: { filters: IETypeFilter }) =>
      getEtypes({ filters, ctx: { virtualLabId, projectId } }),
    [virtualLabId, projectId]
  );

  const getOptionLabel = useCallback(
    (etype: IEType) => etype.pref_label ?? etype.alt_label ?? etype.id,
    []
  );

  const handleSelect = useCallback(
    (option?: { value: string }) => {
      if (!option) {
        onChange({ ...state, [fieldKey]: null });
        return;
      }
      onChange({
        ...state,
        [fieldKey]: { id_str: option.value, type: valueType ?? 'ETypeClassFromID' },
      });
    },
    [fieldKey, onChange, state, valueType]
  );

  const dataKey = useMemo(
    () => keyBuilder.etype({ virtualLabId, projectId }),
    [virtualLabId, projectId]
  );

  // read-only view: the dropdown is interactive-only, so render a static label instead
  if (disabled) {
    const label = selectedEtype
      ? (selectedEtype.pref_label ?? selectedEtype.alt_label)
      : selectedId;
    return (
      <FancyField {...chrome} disabled>
        <div className="px-3 py-2 text-sm text-primary-9">{label ?? 'No e-type selected'}</div>
      </FancyField>
    );
  }

  return (
    <FancyField {...chrome}>
      <AsyncSelect<IETypeFilter, IEType>
        id="scan-config-etype-selector"
        dataKey={dataKey}
        queryFn={queryFn}
        getOptionLabel={getOptionLabel}
        getOptionValue={(etype) => etype.id}
        selectedValue={selectedId}
        placeholder={
          selectedEtype
            ? (selectedEtype.pref_label ?? selectedEtype.alt_label)
            : 'Select an e-type…'
        }
        searchPlaceholder="Search e-type…"
        searchable
        searchField="pref_label__ilike"
        onSelect={handleSelect}
        // the field frame draws the border; the trigger is just the row inside it
        clsx={{
          trigger:
            'h-10 rounded-lg border-0 pl-3 shadow-none hover:border-0 active:border-0 text-sm',
          content: 'z-[99999]',
        }}
      />
    </FancyField>
  );
}

ETypeSelector.uiElement = ScanConfigUIElementDict.EtypeSelector;
