'use client';

import { useWorkspace } from '@/ui/hooks/use-workspace';
import {
  ANALYSIS_NOTEBOOK_TEMPLATE_PROGRESS_STEPS,
  createAnalysisNotebookTemplateConfig,
} from '@/ui/segments/contribute/analysis-notebook-template/config';
import { useAnalysisNotebookTemplatePipeline } from '@/ui/segments/contribute/analysis-notebook-template/pipeline';
import {
  Assets,
  Contribution,
  Setup,
} from '@/ui/segments/contribute/analysis-notebook-template/steps';
import { ContributionForm } from '@/ui/segments/contribute/shared/components/contribution-form';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TAnalysisNotebookTemplateForm } from '@/ui/segments/contribute/analysis-notebook-template/schema';
import type { IContributionStep } from '@/ui/segments/contribute/shared/types';

const ANALYSIS_NOTEBOOK_TEMPLATE_STEP_CONFIG: Array<
  IContributionStep<TAnalysisNotebookTemplateForm>
> = [
  {
    key: 'setup',
    label: 'Setup',
    schemaFieldKey: 'setup',
    component: Setup,
  },
  {
    key: 'assets',
    label: 'Assets',
    schemaFieldKey: 'assets',
    component: Assets,
  },
  {
    key: 'contribution',
    label: 'Contribution',
    schemaFieldKey: 'contribution',
    component: Contribution,
  },
];

const AnalysisNotebookTemplateConfig = createAnalysisNotebookTemplateConfig(
  ANALYSIS_NOTEBOOK_TEMPLATE_STEP_CONFIG
);

interface IAnalysisNotebookTemplateProps {
  sessionId: string;
  onCreateSuccess?: (entity: EntityCoreObjectTypes) => Promise<void>;
  onClose: () => void;
}

export function AnalysisNotebookTemplate({
  sessionId,
  onCreateSuccess,
  onClose,
}: IAnalysisNotebookTemplateProps) {
  const { projectId, virtualLabId } = useWorkspace();

  return (
    <ContributionForm
      config={AnalysisNotebookTemplateConfig}
      sessionId={sessionId}
      pipeline={useAnalysisNotebookTemplatePipeline}
      progressSteps={ANALYSIS_NOTEBOOK_TEMPLATE_PROGRESS_STEPS}
      virtualLabId={virtualLabId}
      projectId={projectId}
      onCreateSuccess={onCreateSuccess}
      brainRegionId={null}
      onDone={onClose}
    />
  );
}
