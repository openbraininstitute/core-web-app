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

  it('keeps the badge count rendered and inside the button, with the name unchanged', () => {
    const { getByText, getByRole } = render(
      <ExpandingToolbarButton icon={null} label="Advanced filters" badge={<span>3</span>} />
    );
    const badge = getByText('3');
    expect(getByRole('button', { name: 'Advanced filters' })).toContainElement(badge);
    // the count must never leak into the accessible name, in either state
    expect(getByRole('button', { name: 'Advanced filters' })).toHaveAttribute(
      'aria-label',
      'Advanced filters'
    );
  });

  it('anchors the badge after the label so it rides the pill open, without layout cost', () => {
    const { getByTestId, getByText } = render(
      <ExpandingToolbarButton icon={null} label="Advanced filters" badge={<span>3</span>} />
    );
    const anchor = getByTestId('toolbar-pill-badge-anchor');
    expect(anchor).toContainElement(getByText('3'));
    // zero-width bookmark: it cannot shift the pill or the toolbar as it travels
    expect(anchor.className).toContain('w-0');
    // it is the LAST child — after the growing label — so the existing
    // grid-template-columns animation carries it out; nothing races it
    expect(anchor.previousElementSibling).toHaveAttribute('aria-hidden', 'true');
    expect(anchor.nextElementSibling).toBeNull();
  });

  it('never lets the travelling badge intercept the pointer', () => {
    const { getByTestId } = render(
      <ExpandingToolbarButton icon={null} label="Advanced filters" badge={<span>3</span>} />
    );
    expect(getByTestId('toolbar-pill-badge-anchor').className).toContain('pointer-events-none');
  });

  it('moves the badge to the corner by transform, on hover AND on focus-visible', () => {
    const { getByTestId } = render(
      <ExpandingToolbarButton icon={null} label="Advanced filters" badge={<span>3</span>} />
    );
    const cls = getByTestId('toolbar-pill-badge-anchor').className;
    // transform only — no width/margin/inset animation to shift the toolbar
    expect(cls).toContain('transition-transform');
    // in lockstep with the label reveal, so the two cannot stutter against each other
    expect(cls).toContain('duration-300');
    expect(cls).toContain('ease-in-out');
    // up and to the right, keyboard users included
    expect(cls).toContain('group-hover/toolbar-pill:translate-x-2.5');
    expect(cls).toContain('group-hover/toolbar-pill:-translate-y-2.5');
    expect(cls).toContain('group-focus-visible/toolbar-pill:translate-x-2.5');
    expect(cls).toContain('group-focus-visible/toolbar-pill:-translate-y-2.5');
  });

  it('reduced motion keeps the destination and drops the journey', () => {
    const { getByTestId } = render(
      <ExpandingToolbarButton icon={null} label="Advanced filters" badge={<span>3</span>} />
    );
    const cls = getByTestId('toolbar-pill-badge-anchor').className;
    // only the transition goes away: the hover/focus translate still applies, so the
    // badge is still at the corner — it just gets there instantly
    expect(cls).toContain('motion-reduce:transition-none');
    expect(cls).not.toContain('motion-reduce:translate-x-0');
  });

  it('renders no badge anchor at all when there is no badge', () => {
    const { queryByTestId } = render(<ExpandingToolbarButton icon={null} label="Columns" />);
    expect(queryByTestId('toolbar-pill-badge-anchor')).toBeNull();
  });
});
