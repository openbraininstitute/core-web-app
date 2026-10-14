'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getEntityCoreContext } from '@/api/entitycore/utils';
import { obioneApi } from '@/api/one/utils';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { FancyMultiSelect } from '@/ui/molecules/fancy-combobox';

import type { ConfigSchema, ConfigValue } from '@/features/scan-config/types';
import type { FancyChrome } from '@/ui/molecules/fancy-input';

const ENDPOINT_ENTITY_PLACEHOLDER = '{circuit_id}';

type SectionTypeOption = { value: number; label: string };

/**
 * Reads the stored configuration value into the flat list of selected section
 * types. The value can be a single selection (`number[]`), a parameter scan
 * (`number[][]`) or `null`. Only single selections are editable here, so scan
 * values are flattened best-effort for display.
 *
 * `null` / missing means “no section-type filter” — all endpoint options are
 * treated as selected. Stored values that are no longer returned by the
 * endpoint (e.g. apical when the morphology has none) are filtered out.
 */
function toSelectedValues(value: ConfigValue, optionValues: number[]): number[] {
  if (value == null || !Array.isArray(value)) return optionValues;
  const result: number[] = [];
  for (const entry of value) {
    if (typeof entry === 'number') result.push(entry);
    else if (Array.isArray(entry)) {
      for (const inner of entry) if (typeof inner === 'number') result.push(inner);
    }
  }
  return result.filter((v) => optionValues.includes(v));
}

/**
 * Renders the `morphology_section_type_selection` UI element. Options (e.g.
 * axon / basal / apical) are discovered from the mapped morphology-source
 * endpoint declared in `schema.property_endpoints[propertyGroup]`.
 */
export function MorphologySectionTypeSelection({
  value,
  onChange,
  disabled,
  schema,
  entityId,
  property,
  propertyGroup,
  chrome,
}: {
  value: ConfigValue;
  onChange: (value: number[] | null) => void;
  disabled: boolean;
  schema: ConfigSchema;
  entityId: string | undefined;
  property: string;
  propertyGroup: string;
  chrome?: FancyChrome;
}) {
  const workspace = useWorkspace();

  const endpoint = useMemo(() => {
    const template = schema.property_endpoints?.[propertyGroup];
    if (!template || !entityId) return null;
    return template.replace(ENDPOINT_ENTITY_PLACEHOLDER, entityId);
  }, [schema.property_endpoints, propertyGroup, entityId]);

  const {
    data: options = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['mapped-morphology-section-types', { endpoint }],
    queryFn: async () => {
      const api = await obioneApi();
      return api.get<Record<string, SectionTypeOption[]>>(`/declared${endpoint}`, {
        headers: {
          accept: 'application/json',
          ...getEntityCoreContext(workspace).headers,
        },
      });
    },
    select: (resp) => resp?.[property] ?? [],
    enabled: !!endpoint,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const selected = useMemo(() => {
    const optionValues = options.map((option) => option.value);
    return toSelectedValues(value, optionValues);
  }, [value, options]);

  return (
    <FancyMultiSelect
      {...chrome}
      data-scan-config-block-element={ScanConfigUIElementDict.MorphologySectionTypeSelection}
      maxBadges={Number.POSITIVE_INFINITY}
      disabled={disabled || !endpoint}
      loading={isLoading}
      error={isError ? 'Section types could not be loaded' : chrome?.error}
      placeholder={isLoading ? 'Loading section types…' : 'Select section types…'}
      options={options.map((option) => ({ label: option.label, value: String(option.value) }))}
      values={selected.map(String)}
      onChange={(next) => onChange(next.length > 0 ? next.map(Number) : null)}
    />
  );
}
