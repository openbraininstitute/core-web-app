import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { ContributionForm } from './contribution-form';

import type { ReactNode } from 'react';
import type { IContributionFormConfig } from '@/ui/segments/contribute/shared/types';

vi.mock('@bprogress/next', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/ui/segments/contribute/flow-elements', () => ({
  ImportLeftSideTab: {
    Type: 'type',
    Options: 'options',
  },
  ImportMode: {
    Single: 'single',
    Multiple: 'multiple',
  },
  UploadFlowSidebar: ({ bottomSlot }: { bottomSlot?: ReactNode }) => (
    <aside data-testid="upload-flow-sidebar">{bottomSlot}</aside>
  ),
}));

vi.mock('@/ui/segments/contribute/shared/components/submit-progress', () => ({
  SubmitEntityProgress: () => <div>Submitting...</div>,
}));

const TestSchema = z.object({
  setup: z.object({}).optional(),
});

type TTestFormValues = z.infer<typeof TestSchema>;

function TestStep() {
  return <div>Step content</div>;
}

const TEST_CONFIG: IContributionFormConfig<TTestFormValues, typeof TestSchema> = {
  entityType: ExtendedEntitiesTypeDict.CellMorphology,
  title: 'Test Entity',
  formId: 'contribution-form-test',
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

describe('ContributionForm', () => {
  it('keeps the left sidebar visible once single upload submission starts', async () => {
    const createEntity = vi.fn(() => new Promise<string>(() => {}));
    const pipeline = () => ({
      createEntity,
      loading: false,
      error: null,
      status: {},
      mutationKeys: {},
    });

    render(
      <ContributionForm
        config={TEST_CONFIG}
        sessionId="session-id"
        brainRegionId="brain-region-id"
        pipeline={pipeline}
        progressSteps={[
          { key: 'create-entity', label: 'Creating entity', mutationKey: 'createEntity' },
        ]}
        virtualLabId="virtual-lab-id"
        projectId="project-id"
        pageShell={{
          typeHref: '/contribute/type',
          optionsHref: '/contribute/options',
          backHref: '/contribute',
          entityTitle: 'Test Entity',
        }}
      />
    );

    expect(screen.getByTestId('upload-flow-sidebar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upload test entity' }));

    await waitFor(() => {
      expect(screen.getByTestId('upload-flow-sidebar')).toBeInTheDocument();
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      expect(screen.getByTestId('single-upload-sidebar-container')).toHaveClass(
        'pointer-events-none'
      );
    });
  });

  it('shows a success panel with a details link after upload completes', async () => {
    const createEntity = vi.fn(async () => 'created-entity-id');
    const pipeline = () => ({
      createEntity,
      loading: false,
      error: null,
      status: {
        createEntity: 'success',
      },
      mutationKeys: {},
    });

    render(
      <ContributionForm
        config={TEST_CONFIG}
        sessionId="session-id"
        brainRegionId="brain-region-id"
        pipeline={pipeline}
        progressSteps={[
          { key: 'create-entity', label: 'Creating entity', mutationKey: 'createEntity' },
        ]}
        virtualLabId="virtual-lab-id"
        projectId="project-id"
        pageShell={{
          typeHref: '/contribute/type',
          optionsHref: '/contribute/options',
          backHref: '/contribute',
          entityTitle: 'Test Entity',
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Upload test entity' }));

    await waitFor(() => {
      expect(
        screen.getByText('Your test entity has been correctly added to your project')
      ).toBeInTheDocument();
      expect(screen.getByText('View test entity').closest('a')).toHaveAttribute('href', '/details');
      expect(screen.getByTestId('single-upload-sidebar-container')).toHaveClass(
        'pointer-events-none'
      );
    });
  });
});
