import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

/** Opens a tooltip and returns its panel and arrow. */
async function openTooltip() {
  render(
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button">trigger</button>
      </TooltipTrigger>
      <TooltipContent>Label</TooltipContent>
    </Tooltip>
  );

  fireEvent.focus(document.querySelector('button') as HTMLElement);
  await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toBeTruthy());

  const panel = document.querySelector('[data-slot="tooltip-content"]') as HTMLElement;
  const arrow = panel.querySelector('svg') ?? panel.nextElementSibling;
  return { panel, arrow: arrow as HTMLElement };
}

/** The single `bg-*` utility on an element. */
const background = (el: Element) =>
  Array.from(el.classList).find((c) => c.startsWith('bg-')) ?? null;

/** The arrow must resolve to the panel's background, not to its `text-white` label colour. */
describe('tooltip arrow', () => {
  it('paints the arrow with the panel background, not the text colour', async () => {
    const { panel, arrow } = await openTooltip();

    expect(background(panel)).toBe('bg-primary-9');
    expect(background(arrow)).toBe('bg-primary-9');
    expect(background(arrow)).toBe(background(panel));
  });

  it('does not inherit the label colour', async () => {
    const { arrow } = await openTooltip();

    // `bg-current` resolves to the panel's `text-white`
    expect(Array.from(arrow.classList)).not.toContain('bg-current');
  });
});
