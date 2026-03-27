import { cn } from '@/utils/css-class';

import type { IAdapterFieldDefinition } from '@/features/entity-import/core/adapter';

// Keep import editor dropdowns above sticky table and validator chrome.
export const ENTITY_IMPORT_POPOVER_Z_CLASS = 'z-[99999]';

export const ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME = cn(
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  'border border-neutral-200 bg-white p-2 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
);

export const ENTITY_IMPORT_PANEL_SELECT_TRIGGER_CLASSNAME =
  'h-8 min-w-20 justify-self-end rounded-full border-2 border-gray-200 bg-transparent text-left text-sm font-medium text-primary-9 shadow-none data-placeholder:text-gray-400 [&_svg]:text-[#0b4dbb] [&_svg]:opacity-100';

export const ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME = cn(
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  'w-80 max-w-70 rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
);

export const ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME = cn(
  'inline-flex size-5 shrink-0 items-center justify-center self-center rounded-full border border-neutral-200',
  'bg-neutral-50 text-sm font-semibold text-primary-9 transition hover:border-neutral-300 hover:bg-white'
);

export function getEntityImportSelectLabel(
  field: IAdapterFieldDefinition,
  rawValue: string | null | undefined
): string {
  const value = rawValue?.trim() ?? '';
  if (!value) {
    return '';
  }

  return field.options?.find((option) => option.value === value)?.label ?? value;
}
