'use client';

import { AnalysisNotebookTemplateSchema } from '@/ui/segments/contribute/analysis-notebook-template/schema';
import { ContributionSelector } from '@/ui/segments/contribute/shared/components/contribution-selector';

export function Contribution() {
  return <ContributionSelector schema={AnalysisNotebookTemplateSchema} />;
}
