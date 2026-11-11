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
  it('is the tours as they are while both platform trials are off', () => {
    expect(discoverTours({ aiButton: false, hideHelp: false })).toBe(OnboardingDiscoverSteps);
    expect(selectors(OnboardingDiscoverSteps)).toContain('#workspace-help');
    expect(selectors(OnboardingDiscoverSteps)).toContain('#workspace-ai');
  });

  it('leaves out the Help step while Help is hidden', () => {
    const tours = discoverTours({ aiButton: false, hideHelp: true });
    expect(selectors(tours)).not.toContain('#workspace-help');
    expect(projectSteps(tours)).toHaveLength(projectSteps(OnboardingDiscoverSteps).length - 1);
  });

  it('points the AI step at the AI button when the flag puts one in the top menu', () => {
    const tours = discoverTours({ aiButton: true, hideHelp: false });
    expect(selectors(tours)).not.toContain('#workspace-ai');
    expect(selectors(tours).at(-1)).toBe('#workspace-ai-button');
  });

  it('leaves the other tours alone', () => {
    const tours = discoverTours({ aiButton: true, hideHelp: true });
    for (const [i, tour] of tours.entries())
      if (tour.tour !== projectTour) expect(tour).toBe(OnboardingDiscoverSteps[i]);
  });
});
