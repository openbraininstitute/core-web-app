'use client';

import { PlayCircleOutlined } from '@ant-design/icons';

export function TutorialPlaceholder() {
  return (
    <div className="relative w-full h-[522.19px] overflow-hidden rounded-xl bg-primary-9 flex flex-col items-center justify-center text-center px-6">
      <div className="flex items-center justify-center size-20 rounded-full bg-white/10 mb-6">
        <PlayCircleOutlined className="text-white! text-4xl" />
      </div>
      <h2 className="text-white text-xl font-semibold mb-2">Select a tutorial to get started</h2>
      <p className="text-white/90 text-sm max-w-md leading-relaxed">
        Choose a video from the list below to learn how to use the platform,
      </p>
      <p className="text-white/90 text-sm max-w-md leading-relaxed">
        Each tutorial walks you through a specific feature or workflow.
      </p>
    </div>
  );
}
