import { describe, expect, it } from 'vitest';

import {
  discoverTours,
  OnboardingDiscoverSteps,
  projectTour,
} from '@/ui/segments/app-setup/discover-app';

import type { Tour } from 'nextstepjs';

const projectSteps = (tours: Tour[]) => tours.find((t) => t.tour === projectTour)?.steps ?? [];
const selectors = (tours: Tour[]) => projectSteps(tours).map((s) => s.selector);

describe('discoverTours', () => {
  it('keeps the Help step while Help is shown', () => {
    const tours = discoverTours({ hideHelp: false });
    expect(selectors(tours)).toContain('#workspace-help');
    expect(projectSteps(tours)).toHaveLength(projectSteps(OnboardingDiscoverSteps).length);
  });

  it('leaves out the Help step while Help is hidden', () => {
    const tours = discoverTours({ hideHelp: true });
    expect(selectors(tours)).not.toContain('#workspace-help');
    expect(projectSteps(tours)).toHaveLength(projectSteps(OnboardingDiscoverSteps).length - 1);
  });

  it('points the AI step at the AI button, as the panel is gone while closed', () => {
    const tours = discoverTours({ hideHelp: false });
    expect(selectors(tours)).not.toContain('#workspace-ai');
    expect(selectors(tours).at(-1)).toBe('#workspace-ai-button');
  });

  it('leaves the other tours alone', () => {
    const tours = discoverTours({ hideHelp: true });
    for (const [i, tour] of tours.entries())
      if (tour.tour !== projectTour) expect(tour).toBe(OnboardingDiscoverSteps[i]);
  });
});
