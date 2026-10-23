import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { themeFromBackground } from '@/features/scan-config/components/color-by/contrast';
import { StatusPill } from '@/features/viewer-3d/chrome/status';

const theme = themeFromBackground('#ffffff');
const box = () => screen.getByRole('status').parentElement as HTMLElement;

describe('StatusPill', () => {
  it('is top-centre unless it is given a place', () => {
    const { rerender } = render(<StatusPill text="Loading…" kind="busy" theme={theme} />);
    expect(box()).toHaveClass('top-3', 'left-1/2');
    expect(box().style.top).toBe('');

    rerender(
      <StatusPill text="Loading…" kind="busy" theme={theme} place={{ top: 52, left: 52 }} />
    );
    expect(box()).not.toHaveClass('left-1/2');
    expect(box()).toHaveStyle({ top: '52px', left: '52px' });
  });

  it('rings a warning alone', () => {
    const ring = () => screen.getByRole('status').style.boxShadow;
    const { rerender } = render(<StatusPill text="Stopped" kind="warning" theme={theme} />);
    expect(ring()).toContain('--color-warning');

    rerender(<StatusPill text="Some left out" kind="info" theme={theme} />);
    expect(ring()).not.toContain('--color-warning');
  });
});
