'use client';

import { CloneStrokeIcon } from '@/components/icons';

export type FormatOptionsProps = {
  name: string;
  key: string;
};

export type FormatProps = {
  sonataFile: string;
  connectomeUtilitiesFile: string;
};

export default function CloneCircuitModelButton() {
  return (
    <button
      type="button"
      aria-label="Open download format options"
      className="relative flex h-12 flex-row items-center"
    >
      <span className="mr-3 block text-base font-normal text-primary-8">Clone model</span>

      <div className="flex h-12 w-12 items-center justify-center border border-gray-300">
        <CloneStrokeIcon iconColor="#003a8c" className="h-auto w-4" />
      </div>
    </button>
  );
}
