import { Suspense } from 'react';

import AnalysisPreview from '@/features/entities/me-model/detail-view/analysis/index';

export default function Analysis() {
  return (
    <Suspense>
      <AnalysisPreview />
    </Suspense>
  );
}
