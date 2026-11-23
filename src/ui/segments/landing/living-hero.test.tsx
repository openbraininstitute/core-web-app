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
            LANDING_MODELS.findIndex((model) => model.label === 'Build detailed brain models')
          );
        }}
      >
        Show Build detailed brain models
      </button>
    </div>
  ),
}));

import { FIRST_SCENE, LivingHero } from './living-hero';

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
  it('opens on the fly brain with the headline and working CTA', () => {
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

  it('keeps the visitor on the homepage after the previous autoplay delay', () => {
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    act(() => vi.advanceTimersByTime(20_000));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('lets tile selection update the hero without advancing away during interaction', () => {
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show Build detailed brain models' }));
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Build detailed brain models');
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
    fireEvent.click(screen.getByRole('button', { name: 'See what you can do' }));
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
