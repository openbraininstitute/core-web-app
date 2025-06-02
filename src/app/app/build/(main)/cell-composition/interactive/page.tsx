'use client';

import useLiteratureCleanNavigate from '@/components/explore-section/Literature/useLiteratureCleanNavigate';
import ThreeDeeBrain from '@/features/brain-atlas-viewer';

export default function InteractiveView() {
  useLiteratureCleanNavigate();

  return (
    <div className="h-full w-full bg-black">
      <ThreeDeeBrain />
    </div>
  );
}
