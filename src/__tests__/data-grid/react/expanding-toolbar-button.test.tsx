import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExpandingToolbarButton } from '@/features/data-grid/react/expanding-toolbar-button';

describe('ExpandingToolbarButton', () => {
  it('keeps one accessible name in both states — the label, never doubled', () => {
    const { getByRole } = render(<ExpandingToolbarButton icon={null} label="Advanced filters" />);
    const button = getByRole('button', { name: 'Advanced filters' });
    expect(button).toHaveAttribute('aria-label', 'Advanced filters');
    // the revealed text is decorative: it repeats the aria-label
    expect(button.querySelector('[aria-hidden="true"]')?.textContent).toBe('Advanced filters');
  });

  it('animates the reveal by grid-template-columns, never by display', () => {
    const { getByRole } = render(<ExpandingToolbarButton icon={null} label="Columns" />);
    const reveal = getByRole('button').querySelector('[aria-hidden="true"]');
    const cls = reveal?.className ?? '';
    expect(cls).toContain('grid-cols-[0fr]');
    expect(cls).toContain('group-hover/toolbar-pill:grid-cols-[1fr]');
    expect(cls).toContain('group-focus-visible/toolbar-pill:grid-cols-[1fr]');
    expect(cls).toContain('transition-[grid-template-columns]');
    // reduced motion keeps the reveal, drops the animation
    expect(cls).toContain('motion-reduce:transition-none');
    expect(cls).not.toContain('hidden');
  });

  it('forwards click and extra button props (it is a popover trigger)', () => {
    const onClick = vi.fn();
    const { getByRole } = render(
      <ExpandingToolbarButton icon={null} label="Columns" onClick={onClick} data-testid="pill" />
    );
    getByRole('button').click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(getByRole('button')).toHaveAttribute('data-testid', 'pill');
  });

  it('pins the badge to the icon so it does not travel with the widening edge', () => {
    const { getByText, getByRole } = render(
      <ExpandingToolbarButton icon={null} label="Advanced filters" badge={<span>3</span>} />
    );
    const badge = getByText('3');
    // the badge sits inside the fixed-size icon box, not in the growing text wrapper
    expect(badge.parentElement?.className).toContain('size-5');
    expect(getByRole('button', { name: 'Advanced filters' })).toContainElement(badge);
  });
});
