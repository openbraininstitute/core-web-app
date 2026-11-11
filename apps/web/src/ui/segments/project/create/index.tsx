'use client';

import { CreationForm } from '@/ui/segments/project/create/form';

type ProjectCreationProps = {
  fixedVirtualLabId?: string;
  onClose: () => void;
  showVirtualLabSelect?: boolean;
};

function Content({
  fixedVirtualLabId,
  showVirtualLabSelect,
}: Pick<ProjectCreationProps, 'fixedVirtualLabId' | 'showVirtualLabSelect'>) {
  return (
    <div className="flex h-full flex-col gap-4">
      <CreationForm
        fixedVirtualLabId={fixedVirtualLabId}
        showVirtualLabSelect={showVirtualLabSelect}
      />
    </div>
  );
}

export function ProjectCreation({ fixedVirtualLabId, showVirtualLabSelect }: ProjectCreationProps) {
  return (
    <div
      id="project-creation-container"
      className="flex h-max p-7 bg-white rounded-2xl max-h-max min-h-0 flex-col overflow-hidden"
    >
      <Content fixedVirtualLabId={fixedVirtualLabId} showVirtualLabSelect={showVirtualLabSelect} />
    </div>
  );
}
