import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/ui/segments/project/brains-walkthrough/chapters', () => ({
  BRAIN_THEMES: ['Virtual Labs', 'Explore'],
  BRAIN_THEME_LINKS: { 'Virtual Labs': 'start', Explore: 'analysis' },
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));

import { LivingHero, SCIENCE_SCENES } from './living-hero';

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
  it('cycles the scientific visuals while preserving the headline, CTA and opening screen', () => {
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={vi.fn()} />);
    expect(screen.getByRole('link', { name: /Try it now/ })).toHaveAttribute(
      'href',
      '/app/virtual-lab'
    );
    expect(screen.queryByText('Explore data.')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Scientific visuals' })).not.toBeInTheDocument();
    for (let index = 0; index < SCIENCE_SCENES.length; index++) {
      expect(screen.getByTestId('model-cube-field')).toHaveAttribute(
        'data-group',
        SCIENCE_SCENES[index].group
      );
      expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2);
      act(() => vi.advanceTimersByTime(SCIENCE_SCENES[index].duration));
      expect(screen.getByTestId('science-caption')).toHaveTextContent(
        SCIENCE_SCENES[(index + 1) % SCIENCE_SCENES.length].label
      );
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Neuroscience at the speed of thought'
    );
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('keeps rotating without a homepage pause control or playback line', () => {
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Inspect neuron meshes' }));
    expect(screen.queryByRole('button', { name: /Pause/ })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(SCIENCE_SCENES[2].duration));
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Simulate activity');
  });

  it('shows stills and does not auto-rotate for reduced motion', () => {
    reduced = true;
    render(<LivingHero onContinue={vi.fn()} onChapter={vi.fn()} />);
    expect(screen.getByTestId('inspect-mesh').getAttribute('src')).toContain(
      'em-cell-mesh-poster.png'
    );
    act(() => vi.advanceTimersByTime(18000));
    expect(screen.getByTestId('science-caption')).toHaveTextContent('Build models');
  });

  it('activates the selected cube family and matches its caption', () => {
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

  it('opens the chosen chapter and lets visitors continue by scroll', () => {
    const onChapter = vi.fn();
    const onContinue = vi.fn();
    render(<LivingHero onContinue={onContinue} onChapter={onChapter} />);
    fireEvent.click(screen.getByRole('button', { name: /^Explore$/ }));
    expect(onChapter).toHaveBeenCalledWith('analysis');
    expect(screen.queryByRole('button', { name: /Discover Virtual Labs/ })).not.toBeInTheDocument();
    fireEvent.wheel(screen.getByRole('region', { name: 'Discover the Open Brain Platform' }), {
      deltaY: 30,
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
