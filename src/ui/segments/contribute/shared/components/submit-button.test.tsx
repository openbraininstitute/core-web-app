import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ContributionPipelineProvider } from '@/ui/segments/contribute/shared/pipeline/context';

import { SubmitButton } from './submit-button';

import type { IContributionFormConfig } from '@/ui/segments/contribute/shared/types';

vi.mock('@bprogress/next', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

const TestSchema = z.object({
  setup: z.object({}).optional(),
});

type TTestFormValues = z.infer<typeof TestSchema>;

const TestStep = () => null;

const TEST_CONFIG: IContributionFormConfig<TTestFormValues, typeof TestSchema> = {
  entityType: ExtendedEntitiesTypeDict.CellMorphology,
  title: 'Cell Morphology',
  formId: 'submit-button-test-form',
  schema: TestSchema,
  progressSteps: [
    {
      key: 'setup',
      label: 'Setup',
      schemaFieldKey: 'setup',
      component: TestStep,
    },
  ],
  getInitialValues: () => ({
    setup: {},
  }),
  buildDetailsUrl: () => '/details',
};

describe('SubmitButton', () => {
  it('renders an upload label using the entity name', () => {
    render(
      <ContributionPipelineProvider
        config={TEST_CONFIG}
        sessionId="session-id"
        brainRegionId="brain-region-id"
      >
        <SubmitButton
          loading={false}
          config={TEST_CONFIG}
          virtualLabId="virtual-lab-id"
          projectId="project-id"
          onSubmit={vi.fn().mockResolvedValue(undefined)}
        />
      </ContributionPipelineProvider>
    );

    expect(screen.getByRole('button', { name: 'Upload cell morphology' })).toBeInTheDocument();
  });
});
