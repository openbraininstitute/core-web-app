import { cn } from '@/utils/css-class';

import type { IAdapterFieldDefinition } from '@/features/entity-import/core/adapter';

// keep import editor dropdowns above sticky table and validator
export const ENTITY_IMPORT_POPOVER_Z_CLASS = 'z-[99999]';

/** Base shell for import-related selects (z-index, border, shadow). Use `p-0`; pad via viewport or items. */
export const ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME = cn(
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  'border border-neutral-200 bg-white p-0 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
);

/**
 * Trigger-aligned menu: width matches trigger, rounded panel, items get inset `rounded-lg` highlights
 * (species, repair pipeline, validator enum fields).
 */
export const ENTITY_IMPORT_SELECT_MENU_PANEL_CLASSNAME = cn(
  ENTITY_IMPORT_SELECT_CONTENT_CLASSNAME,
  'rounded-2xl overflow-x-hidden',
  'min-w-[var(--radix-select-trigger-width)] w-[var(--radix-select-trigger-width)]'
);

/** Option row: full width inside viewport, rounded highlight aligned with panel curvature. */
export const ENTITY_IMPORT_SELECT_MENU_ITEM_CLASSNAME = cn(
  'relative flex w-full min-w-0 max-w-full items-center rounded-lg',
  'min-h-11 h-11 px-3 pr-10 text-left text-base font-semibold text-primary-9',
  'cursor-pointer outline-none select-none',
  'focus:bg-sky-50 focus:text-primary-9',
  'data-[highlighted]:bg-sky-50 data-[highlighted]:text-primary-9',
  'data-[state=checked]:bg-sky-100/80 data-[state=checked]:text-primary-9',
  'data-[disabled]:pointer-events-none data-[disabled]:text-neutral-400 data-[disabled]:opacity-100',
  '[&_span.indicator]:right-3'
);

export const ENTITY_IMPORT_PANEL_SELECT_TRIGGER_CLASSNAME =
  'h-8 w-[6.55rem] justify-self-end justify-between rounded-full border-2 border-gray-200 bg-transparent text-left text-sm font-medium text-primary-9 shadow-none data-placeholder:text-gray-400 [&_svg]:text-[#0b4dbb] [&_svg]:opacity-100';

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
