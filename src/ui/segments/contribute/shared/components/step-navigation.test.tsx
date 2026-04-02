import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VerticalStepNavigation } from './step-navigation';

vi.mock('@/ui/segments/contribute/shared/pipeline/context', () => ({
  useContributionPipeline: () => ({
    progressSteps: [
      { key: 'setup', label: 'Setup' },
      { key: 'subject', label: 'Subject' },
    ],
    activeStep: 'setup',
    setActiveStep: vi.fn(),
    stepValidationStatus: {
      setup: 'valid',
      subject: 'invalid',
    },
  }),
}));

describe('VerticalStepNavigation', () => {
  it('keeps non-active invalid step labels blue and lets the icon carry the error state', () => {
    render(<VerticalStepNavigation />);

    const invalidLabel = screen.getByText('Subject');

    expect(invalidLabel.className).toContain('text-primary-9');
    expect(invalidLabel).not.toHaveClass('text-error');
  });

  it('does not render an active-selected step style when active selection is suppressed', () => {
    render(<VerticalStepNavigation suppressActiveSelection />);

    const activeLabel = screen.getByText('Setup');

    expect(activeLabel.className).toContain('text-primary-9');
    expect(activeLabel).not.toHaveClass('text-white');
  });
});
