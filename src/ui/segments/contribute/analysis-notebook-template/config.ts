import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import {
  AnalysisNotebookTemplateSchema,
  type TAnalysisNotebookTemplateForm,
} from '@/ui/segments/contribute/analysis-notebook-template/schema';
import {
  type IContributionFormConfig,
  type IContributionStep,
} from '@/ui/segments/contribute/shared';

export const ANALYSIS_NOTEBOOK_TEMPLATE_PROGRESS_STEPS: Array<{
  key: string;
  label: string;
  mutationKey: string;
}> = [
  {
    key: 'analysis-notebook-template',
    label: 'Creating Analysis Notebook Template',
    mutationKey: 'createAnalysisNotebookTemplate',
  },
  {
    key: 'upload-assets',
    label: 'Uploading Assets',
    mutationKey: 'uploadAssets',
  },
  {
    key: 'contribution',
    label: 'Creating Contribution',
    mutationKey: 'createContribution',
  },
];

export function createAnalysisNotebookTemplateConfig(
  steps: Array<IContributionStep<TAnalysisNotebookTemplateForm>>
): IContributionFormConfig<TAnalysisNotebookTemplateForm, typeof AnalysisNotebookTemplateSchema> {
  return {
    entityType: ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
    title: 'Analysis Notebook Template',
    formId: 'contribute-analysis-notebook-template-modal',
    schema: AnalysisNotebookTemplateSchema,
    progressSteps: steps,
    getInitialValues: () => ({
      setup: {} as TAnalysisNotebookTemplateForm['setup'],
      assets: {
        notebook: undefined,
        requirements: undefined,
        zip: undefined,
      } as unknown as TAnalysisNotebookTemplateForm['assets'],
      contribution: [{}] as unknown as TAnalysisNotebookTemplateForm['contribution'],
    }),
    buildDetailsUrl: ({ virtualLabId, projectId }) =>
      `/app/virtual-lab/${virtualLabId}/${projectId}/notebooks/private`,
  };
}
