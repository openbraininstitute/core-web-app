'use client';

import { StringSelectionEnhanced } from '@/features/scan-config/components/ui-elements/string-selection-enhanced';
import {
  ScanConfigUIElementDict,
  type AxonModifier as TAxonModifier,
  type StringSelectionEnhanced as TStringSelectionEnhanced,
} from '@/features/scan-config/types';

export interface IAxonModifierProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  paramSchema: TAxonModifier;
}

/**
 * Renderer for the `axon_modifier` schema UI element.
 *
 * The field is structurally the same as `string_selection_enhanced` (enum + title/description
 * maps), so this is a thin wrapper that re-tags the schema and delegates to
 * {@link StringSelectionEnhanced} for the actual dropdown.
 */
export function AxonModifier({ value, onChange, disabled, paramSchema }: IAxonModifierProps) {
  const stringSelectionSchema: TStringSelectionEnhanced = {
    ...paramSchema,
    ui_element: ScanConfigUIElementDict.StringSelectionEnhanced,
  };

  return (
    <StringSelectionEnhanced
      value={value}
      onChange={onChange}
      disabled={disabled}
      paramSchema={stringSelectionSchema}
    />
  );
}
