import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LANDING_MODELS } from './landing-models';

vi.mock('@/ui/segments/project/brains-walkthrough/chapters', () => ({
  BRAIN_THEMES: ['Virtual Labs', 'Explore'],
  BRAIN_THEME_LINKS: { 'Virtual Labs': 'start', Explore: 'analysis' },
}));

vi.mock('./information-font', () => ({ informationFont: { variable: 'information-font' } }));

vi.mock('./landing-tile-stage', () => ({
  LANDING_WAY_IN: 'landing-way-in',
  LandingTileStage: ({
    scene,
    reduced,
    onSelect,
    onInteraction,
  }: {
    scene: number;
    reduced: boolean;
    onSelect: (index: number) => void;
    onInteraction: () => void;
  }) => (
    <div data-testid="landing-artwork" data-reduced={reduced}>
      <h1>Neuroscience at the speed of thought</h1>
      <p data-testid="science-caption">{LANDING_MODELS[scene].label}</p>
      <a href="/app/virtual-lab">Try it now</a>

      <button
        type="button"
        onClick={() => {
          onInteraction?.();
          onSelect(
            LANDING_MODELS.findIndex((model) => model.label === 'Extract skeletons and spines')
          );
        }}
      >
        Show Extract skeletons and spines
      </button>
    </div>
  ),
}));

import { FIRST_SCENE, LANDING_AUTO_CONTINUE_MS, LivingHero } from './living-hero';

let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('public science opening', () => {
  it('opens on the first model with the headline and working CTA', () => {
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    expect(screen.getByTestId('science-caption')).toHaveTextContent(
      LANDING_MODELS[FIRST_SCENE].label
    );
    expect(screen.getByRole('link', { name: 'Try it now' })).toHaveAttribute(
      'href',
      '/app/virtual-lab'
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Neuroscience at the speed of thought'
    );
  });

  it('waits for the whole landing before counting down to the first chapter', () => {
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    act(() => vi.advanceTimersByTime(20_000));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('uses the chapter selector transition after eight seconds, once per page load', () => {
    const onContinue = vi.fn();
    const onChapter = vi.fn();
    const { unmount } = render(<LivingHero onContinue={onContinue} onChapter={onChapter} />);
    act(() => window.dispatchEvent(new Event('landing-way-in')));
    act(() => vi.advanceTimersByTime(LANDING_AUTO_CONTINUE_MS - 1));
    expect(onChapter).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onChapter).toHaveBeenCalledExactlyOnceWith('start');
    expect(onContinue).not.toHaveBeenCalled();
    unmount();
    render(<LivingHero onContinue={onContinue} onChapter={onChapter} />);
    act(() => window.dispatchEvent(new Event('landing-way-in')));
    act(() => vi.advanceTimersByTime(20_000));
    expect(onChapter).toHaveBeenCalledTimes(1);
  });

  it('lets tile selection update the hero without advancing away during interaction', () => {
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    act(() => window.dispatchEvent(new Event('landing-way-in')));
    fireEvent.click(screen.getByRole('button', { name: 'Show Extract skeletons and spines' }));
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Extract skeletons and spines');
    act(() => vi.advanceTimersByTime(20_000));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it.each([
    'pointermove',
    'keydown',
    'pointerdown',
  ])('cancels automatic navigation on %s anywhere on the page', (event) => {
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    act(() => window.dispatchEvent(new Event('landing-way-in')));
    act(() => vi.advanceTimersByTime(1000));
    fireEvent(window, new Event(event));
    act(() => vi.advanceTimersByTime(20_000));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('does not navigate automatically with reduced motion', () => {
    reduced = true;
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    act(() => vi.advanceTimersByTime(20_000));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('passes reduced motion to the tile artwork', () => {
    reduced = true;
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    expect(screen.getByTestId('landing-artwork')).toHaveAttribute('data-reduced', 'true');
  });

  it('opens the chosen chapter and lets visitors continue by arrow or scroll', () => {
    const onChapter = vi.fn();
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={onChapter} />);
    fireEvent.click(screen.getByRole('button', { name: /^Explore$/ }));
    expect(onChapter).toHaveBeenCalledWith('analysis');
    expect(screen.queryByRole('button', { name: /Discover Virtual Labs/ })).not.toBeInTheDocument();
    const continueButton = screen
      .getAllByRole('button', { name: 'See what you can do' })
      .find((button) => !button.hasAttribute('aria-haspopup'));
    if (!continueButton) throw new Error('Missing desktop tour invitation');
    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
    fireEvent.wheel(screen.getByRole('region', { name: 'Discover the Open Brain Platform' }), {
      deltaY: 30,
    });
    expect(onContinue).toHaveBeenCalledTimes(2);
  });
  it('accumulates small trackpad deltas and enters only once per gesture', () => {
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    const hero = screen.getByRole('region', { name: 'Discover the Open Brain Platform' });
    for (let i = 0; i < 8; i++) fireEvent.wheel(hero, { deltaY: 4 });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
