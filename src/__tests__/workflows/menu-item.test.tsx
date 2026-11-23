import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MenuItem } from '@/ui/segments/workflows/elements/menu-item';

describe('MenuItem', () => {
  it('tells of a click', () => {
    const onClick = vi.fn();
    render(
      <MenuItem title="Build" value="build" disabled={false} active={false} onClick={onClick} />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledWith('build');
  });

  it('takes a click when disabled, for nothing: it does not fall through to what is behind it', () => {
    const onClick = vi.fn();
    render(<MenuItem title="Build" value="build" disabled active={false} onClick={onClick} />);

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(onClick).not.toHaveBeenCalled();
    expect(card.className).not.toContain('pointer-events-none');
    expect(card).toHaveAttribute('aria-disabled', 'true');
  });
});
