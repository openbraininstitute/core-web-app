import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActivityValues } from '@/ui/segments/workflows/config';
import {
  CategorySelectScrollable,
  EntityTypeSelectScrollable,
} from '@/ui/segments/workflows/elements/selectors';

/**
 * A fixed width clamped by `max-w-max` shrinks in Chrome but not in Safari, which
 * stretched these triggers across the toolbar. jsdom has no layout engine, so the class
 * list is the only observable — these assert the pairing does not come back.
 */

vi.mock('@/features/feature-flags', () => ({ useFlags: () => ({}) }));
vi.mock('@/ui/hooks/create-break-point', () => ({ useDefaultBreakpoint: () => 'l' }));

const trigger = () => screen.getAllByRole('combobox')[0] as HTMLElement;

const widthClasses = (el: HTMLElement) =>
  Array.from(el.classList).filter((c) => /^w-|^max-w-|^min-w-/.test(c));

describe('workflow category/type selectors size to their content', () => {
  it("lets the Category trigger keep SelectTrigger's own w-fit", () => {
    render(<CategorySelectScrollable value={ActivityValues.Build} onSelect={vi.fn()} />);

    expect(widthClasses(trigger())).toContain('w-fit');
  });

  it('lets the Type trigger keep it too', () => {
    render(
      <EntityTypeSelectScrollable category={ActivityValues.Build} value={null} onSelect={vi.fn()} />
    );

    expect(widthClasses(trigger())).toContain('w-fit');
  });

  it('pins no fixed width and no max-content clamp on either trigger', () => {
    render(
      <>
        <CategorySelectScrollable value={ActivityValues.Build} onSelect={vi.fn()} />
        <EntityTypeSelectScrollable
          category={ActivityValues.Build}
          value={null}
          onSelect={vi.fn()}
        />
      </>
    );

    for (const el of screen.getAllByRole('combobox')) {
      const widths = widthClasses(el as HTMLElement);
      // a fixed width is what forced the max-content clamp in the first place
      expect(widths.filter((c) => /^w-/.test(c))).toEqual(['w-fit']);
      expect(widths).not.toContain('max-w-max');
    }
  });

  it('keeps the minimum width, so a short label still fills the pill', () => {
    render(<CategorySelectScrollable value={ActivityValues.Build} onSelect={vi.fn()} />);

    expect(widthClasses(trigger())).toContain('min-w-36');
  });
});
