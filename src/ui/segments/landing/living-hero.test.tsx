import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/ui/segments/project/brains-walkthrough/chapters', () => ({
  BRAIN_THEMES: ['Virtual Labs', 'Explore'],
  BRAIN_THEME_LINKS: { 'Virtual Labs': 'start', Explore: 'analysis' },
}));

vi.mock('./information-font', () => ({ informationFont: { variable: 'information-font' } }));

vi.mock('./landing-tile-stage', () => ({
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
      <p data-testid="science-caption">
        {['Simulate activity', 'Explore data', 'Build models', 'Virtual labs'][scene]}
      </p>
      <a href="/app/virtual-lab">Try it now</a>
      <button
        type="button"
        onClick={() => {
          onInteraction();
          onSelect(2);
        }}
      >
        Show Build models
      </button>
    </div>
  ),
}));

import { LANDING_AUTO_CONTINUE_MS, LivingHero, SCIENCE_SCENES } from './living-hero';

let reduced = false;
beforeEach(() => {
  vi.useFakeTimers();
  reduced = false;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
});
/** Makes the hero's random pick land on the given scene. */
function pick(index: number) {
  vi.spyOn(Math, 'random').mockReturnValue((index + 0.5) / SCIENCE_SCENES.length);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('public science opening', () => {
  it('shows a random export scene with the original headline and working CTA', () => {
    SCIENCE_SCENES.forEach((scene, index) => {
      pick(index);
      render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
      expect(screen.getByTestId('science-caption')).toHaveTextContent(scene.label);
      expect(screen.getByRole('link', { name: 'Try it now' })).toHaveAttribute(
        'href',
        '/app/virtual-lab'
      );
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Neuroscience at the speed of thought'
      );
      cleanup();
    });
  });

  it('glides on to the first chapter by itself, once, within ten seconds', () => {
    expect(LANDING_AUTO_CONTINUE_MS).toBeLessThan(10000);
    const onContinue = vi.fn();
    const { rerender } = render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    act(() => vi.advanceTimersByTime(LANDING_AUTO_CONTINUE_MS / 2));
    // A fresh callback from the parent must not restart the countdown.
    rerender(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    act(() => vi.advanceTimersByTime(LANDING_AUTO_CONTINUE_MS / 2 - 1));
    expect(onContinue).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onContinue).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(LANDING_AUTO_CONTINUE_MS * 2));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('lets tile selection update the hero without advancing away during interaction', () => {
    pick(1);
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show Build models' }));
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Build models');
    act(() => vi.advanceTimersByTime(LANDING_AUTO_CONTINUE_MS * 2));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('passes reduced motion to the tile artwork', () => {
    reduced = true;
    pick(2);
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
    fireEvent.click(screen.getByRole('button', { name: 'Next screen' }));
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
