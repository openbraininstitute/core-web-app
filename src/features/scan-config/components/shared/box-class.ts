/**
 * The white card a pane of the results or the configuration sits in: the Data
 * page's, rounded, with its faint navy ring and soft navy drop under a white top
 * highlight.
 */
export const BOX_CLASS =
  'rounded-3xl bg-white ring-1 ring-primary-9/5 shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_4px_12px_-6px_rgb(0_39_102/0.08),0_1px_2px_rgb(0_39_102/0.04)]';

/**
 * The hover card the results' plots show (their `TooltipCard`): near-white over what is under it,
 * a grey rule and a soft shadow.
 */
export const HOVER_CARD_CLASS =
  'rounded-xl border border-neutral-2 bg-white/95 shadow-lg backdrop-blur-sm';

/** A block's or a field's description, or why it can't be picked, in the hover card on hover. */
export const DESCRIPTION_TOOLTIP_CLASS = `${HOVER_CARD_CLASS} text-primary-9 max-w-2xs min-w-2xs px-4 py-2 text-base text-wrap overflow-y-auto max-h-50 secondary-scrollbar`;
