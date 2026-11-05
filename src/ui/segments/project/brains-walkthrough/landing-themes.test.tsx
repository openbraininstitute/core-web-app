import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./chapters', () => ({ BRAIN_THEMES: ['Virtual Labs', 'Explore'] }));

import { ThemeLine } from './landing-themes';

afterEach(() => vi.restoreAllMocks());

describe('chapter timeline', () => {
  it('shows playback progress on the first chapter without needing a chapter change', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const left = this.tagName === 'BUTTON' && this.textContent === 'Explore' ? 100 : 0;
      return {
        left,
        right: left + 100,
        width: 100,
        top: 0,
        bottom: 44,
        height: 44,
        x: left,
        y: 0,
        toJSON() {},
      };
    });
    const props = {
      underlined: 'Virtual Labs',
      links: { 'Virtual Labs': 'start', Explore: 'analysis' },
      goTo: vi.fn(),
      publicAppearance: true,
    };
    const { container, rerender } = render(
      <ThemeLine {...props} playback={{ progress: 0.25, playing: true, toggle: vi.fn() }} />
    );
    const line = container.querySelector('[class*="timelinePlayback"]');
    expect(line).toBeInTheDocument();
    expect(line).toHaveStyle({ left: '50px', width: '100px' });
    expect(line?.firstElementChild).toHaveStyle({ transform: 'scaleX(0.25)' });
    rerender(<ThemeLine {...props} playback={{ progress: 0.5, playing: true, toggle: vi.fn() }} />);
    expect(line?.firstElementChild).toHaveStyle({ transform: 'scaleX(0.5)' });
  });
});
