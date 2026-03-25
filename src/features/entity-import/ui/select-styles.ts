import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/ui/entity-import-popover';
import { cn } from '@/utils/css-class';

import type { AdapterFieldDefinition } from '@/features/entity-import/core/adapter';

export const ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME = cn(
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  'border border-neutral-200 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
);

export const ENTITY_IMPORT_PANEL_SELECT_TRIGGER_CLASSNAME =
  'h-8 min-w-20 justify-self-end rounded-full border-2 border-gray-200 bg-transparent text-left text-sm font-medium text-primary-9 shadow-none data-placeholder:text-gray-400 [&_svg]:text-[#0b4dbb] [&_svg]:opacity-100';

export function getEntityImportSelectLabel(
  field: AdapterFieldDefinition,
  rawValue: string | null | undefined
): string {
  const value = rawValue?.trim() ?? '';
  if (!value) {
    return '';
  }

  return field.options?.find((option) => option.value === value)?.label ?? value;
}
