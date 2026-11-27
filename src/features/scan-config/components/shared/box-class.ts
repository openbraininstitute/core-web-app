import { cn } from '@/utils/css-class';

/**
 * The white card a pane of the results or the configuration sits in: the Data
 * page's, rounded, with its faint navy ring and soft navy drop under a white top
 * highlight.
 */
export const BOX_CLASS =
  'rounded-3xl bg-white ring-1 ring-primary-9/5 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_12px_-6px_rgb(0_39_102/0.08),0_1px_2px_rgb(0_39_102/0.04)]';

/** The scan-config page's inset from the main area's left edge, every host alike. */
export const PAGE_INSET_CLASS = 'pl-2';

/** A right-hand pane's inset: past the grid gap, top and foot level with the blocks-and-form window. */
export const PANE_INSET_CLASS = 'pt-px pr-px pb-3 pl-3';

/**
 * The hover card the results' plots show (their `TooltipCard`): near-white over what is under it,
 * a grey rule and a soft shadow.
 */
export const HOVER_CARD_CLASS =
  'rounded-xl border border-neutral-2 bg-white/95 shadow-lg backdrop-blur-sm';

/** A block's or a field's description, or why it can't be picked, in the hover card on hover. */
export const DESCRIPTION_TOOLTIP_CLASS = `${HOVER_CARD_CLASS} text-primary-9 max-w-2xs min-w-2xs px-4 py-2 text-base text-wrap overflow-y-auto max-h-50 secondary-scrollbar`;

/** The blocks-and-form window's two columns: on the grid's tracks where subgrid is supported, halves otherwise. */
export const BLOCKS_AND_FORM_COLUMNS_CLASS =
  'grid-cols-2 supports-[grid-template-columns:subgrid]:grid-cols-subgrid';

/** The launch button's green, which the configuration's generate buttons share. */
export const LAUNCH_GREEN = 'bg-[linear-gradient(94.93deg,#389E0D_18.84%,#143805_116.7%)]';

/** The text of the launch and generate buttons. */
export const TASK_BUTTON_TEXT = 'text-base font-semibold text-balance';

const GENERATE_CLICKABLE =
  'shadow-[0_3px_8px_-1px_rgb(20_56_5/0.3)] transition-[scale] duration-200 ease-out motion-safe:hover:scale-[1.02]';

/** The generate buttons' pill, in the launch button's text and green. */
export function generateButtonClass(disabled: boolean): string {
  return cn(
    'flex min-h-12.5 p-2 w-full items-center justify-center rounded-full ring-1 ring-black/5',
    TASK_BUTTON_TEXT,
    disabled ? 'bg-gray-300 text-gray-500' : [LAUNCH_GREEN, GENERATE_CLICKABLE, 'text-white']
  );
}
