'use client';

import { useParams } from 'next/navigation';
import ContributeMorphologyConfiguration from '@/features/contribute/morphology';
import { WorkspaceContext } from '@/types/common';

type Params = WorkspaceContext;

export default function MorphologyPage() {
  const params = useParams<Params>();
  const { virtualLabId, projectId } = params;

  return <ContributeMorphologyConfiguration virtualLabId={virtualLabId} projectId={projectId} />;
}
