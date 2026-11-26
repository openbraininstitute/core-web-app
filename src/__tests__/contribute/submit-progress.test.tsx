import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SubmitEntityProgress } from '@/ui/segments/contribute/shared/components/submit-progress';
import { toProgressSteps } from '@/ui/segments/contribute/shared/helpers';

describe('SubmitEntityProgress', () => {
  it('counts a running step by its share done and shows its detail and the notice', async () => {
    render(
      <SubmitEntityProgress
        steps={[
          { key: 'a', label: 'A', status: 'success' },
          {
            key: 'b',
            label: 'B',
            status: 'pending',
            progress: { detail: 'Uploading 1 GB of 6 GB', fraction: 0.5 },
          },
        ]}
        notice="done"
      />
    );

    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Uploading 1 GB of 6 GB')).toBeInTheDocument();
    expect(screen.getByTestId('submit-progress-notice')).toHaveTextContent('done');
  });

  it('counts a step that is not running as not done and shows no notice', async () => {
    render(
      <SubmitEntityProgress
        steps={[
          { key: 'a', label: 'A', status: 'success' },
          { key: 'b', label: 'B', status: 'error', progress: { detail: 'hidden', fraction: 0.9 } },
        ]}
      />
    );

    expect(await screen.findByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('hidden')).not.toBeInTheDocument();
    expect(screen.queryByTestId('submit-progress-notice')).not.toBeInTheDocument();
  });
});

describe('toProgressSteps', () => {
  const steps = [
    { key: 'create', label: 'Create', mutationKey: 'createEntity' },
    { key: 'upload', label: 'Upload', mutationKey: 'upload' },
    { key: 'convert', label: 'Convert', mutationKey: 'convert' },
  ];

  it('leaves out skipped steps and adds each step its status and progress', () => {
    const progress = { detail: 'Uploading', fraction: 0.4 };

    expect(
      toProgressSteps(steps, {
        status: { createEntity: 'success', upload: 'pending', convert: 'idle' },
        stepProgress: { upload: progress },
        skippedSteps: ['convert'],
      })
    ).toEqual([
      { key: 'create', label: 'Create', status: 'success', progress: undefined },
      { key: 'upload', label: 'Upload', status: 'pending', progress },
    ]);
  });

  it('keeps every step when nothing is skipped', () => {
    expect(toProgressSteps(steps, { status: {} }).map((step) => step.key)).toEqual([
      'create',
      'upload',
      'convert',
    ]);
  });
});
