import { useAtomValue } from 'jotai';

import { PDFViewerContainer } from '@/components/explore-section/common/pdf/PDFViewerContainer';
import { validationResultAtom } from '@/features/entities/me-model/detail-view/analysis/context';
import { MEModel } from '@/types/me-model';
import { useParams } from 'next/navigation';
import { WorkspaceContext } from '@/types/common';
import { useMemo } from 'react';

const statusMessage: Record<MEModel['status'], string> = {
  initialized: 'No ME-Model analysis yet',
  running: 'ME-Model analysis is running',
  done: 'ME-Model analysis done',
  failed: 'ME-Model analysis failed',
};

export default function AnalysisPreview() {
  const { virtualLabId, projectId, id } = useParams<WorkspaceContext & { id: string }>();
  const meModelValidationResult = useAtomValue(
    useMemo(
      () => validationResultAtom({ id, workspace: { virtualLabId, projectId } }),
      [id, virtualLabId, projectId]
    )
  );
  console.log('–– – index.tsx:27 – meModelValidationResult:', meModelValidationResult);
  return null;
  // return <PDFViewerContainer distributions={distributions} />;
}
