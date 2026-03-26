'use client';

import { ENTITY_IMPORT_POPOVER_Z_CLASS } from '@/features/entity-import/ui/entity-import-popover';
import { cn } from '@/utils/css-class';

export const ENTITY_IMPORT_TOOLTIP_CARD_CLASSNAME = cn(
  ENTITY_IMPORT_POPOVER_Z_CLASS,
  'w-80 max-w-70 rounded-xl border border-neutral-200 bg-white p-2 text-sm text-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
);

export const ENTITY_IMPORT_TOOLTIP_BADGE_TRIGGER_CLASSNAME = cn(
  'inline-flex size-5 shrink-0 items-center justify-center self-center rounded-full border border-neutral-200',
  'bg-neutral-50 text-sm font-semibold text-primary-9 transition hover:border-neutral-300 hover:bg-white'
);
