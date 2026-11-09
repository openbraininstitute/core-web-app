import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/ui/segments/project/brains-walkthrough/chapters', () => ({
  BRAIN_THEMES: ['Virtual Labs', 'Explore'],
  BRAIN_THEME_LINKS: { 'Virtual Labs': 'start', Explore: 'analysis' },
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));

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
  it('shows one randomly picked scene with the headline and CTA, without rotating', () => {
    SCIENCE_SCENES.forEach((scene, index) => {
      pick(index);
      render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
      expect(screen.getByTestId('model-cube-field')).toHaveAttribute('data-group', scene.group);
      expect(screen.getByTestId('science-caption')).toHaveTextContent(scene.label);
      expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2);
      act(() => vi.advanceTimersByTime(LANDING_AUTO_CONTINUE_MS - 1));
      expect(screen.getByTestId('science-caption')).toHaveTextContent(scene.label);
      cleanup();
    });
    pick(0);
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Try it now/ })).toHaveAttribute(
      'href',
      '/app/virtual-lab'
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Neuroscience at the speed of thought'
    );
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

  it('lets the visitor switch scene from the cubes', () => {
    pick(1);
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect neuron meshes' }));
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Inspect neurons');
    expect(screen.queryByRole('button', { name: /Pause/ })).not.toBeInTheDocument();
  });

  it('shows stills for reduced motion', () => {
    reduced = true;
    pick(2);
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    expect(screen.getByTestId('inspect-mesh').getAttribute('src')).toContain(
      'em-cell-mesh-poster.png'
    );
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Inspect neurons');
  });

  it('activates the selected cube family and matches its caption', () => {
    pick(0);
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Simulate fly-neuron activity' }));
    expect(screen.getByTestId('model-cube-field')).toHaveAttribute('data-group', 'simulate');
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Simulate activity');
    expect(screen.getByRole('button', { name: 'Build circuit models' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Simulate circuit activity' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
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
