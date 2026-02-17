'use client';

import { CloseOutlined } from '@ant-design/icons';

import { Button } from '@/ui/molecules/button';
import { CreationForm } from '@/ui/segments/project/create/form';

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-2 text-white">
      <h2 className="text-2xl font-bold select-none">Add project</h2>
      <Button type="button" onClick={onClose}>
        <CloseOutlined />
      </Button>
    </div>
  );
}

function Content() {
  return (
    <div className="flex h-full flex-col gap-4">
      <CreationForm />
    </div>
  );
}

export function ProjectCreation({ onClose }: { onClose: () => void }) {
  return (
    <div
      id="project-creation-container"
      className="flex h-max max-h-max min-h-0 flex-col overflow-hidden"
    >
      <div
        id="project-creation-header"
        className="bg-primary-9 sticky top-0 left-0 z-[1002] px-6 py-2"
      >
        <Header onClose={onClose} />
      </div>
      <div
        id="project-creation-content"
        className="primary-scrollbar h-max min-h-0 flex-1 overflow-y-auto px-6 py-4 transition-opacity duration-200 ease-in-out"
      >
        <Content />
      </div>
    </div>
  );
}
