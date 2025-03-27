'use client';

import { SimulateIcon } from '@/components/icons';

export type FormatOptionsProps = {
  name: string;
  key: string;
};

export type FormatProps = {
  sonataFile: string;
  connectomeUtilitiesFile: string;
};

export default function SimulateCircuitModelButton() {
  return (
    <button
      type="button"
      aria-label="Open download format options"
      className="relative flex h-12 flex-row items-center"
    >
      <span className="mr-3 block whitespace-nowrap text-base font-normal text-primary-8">
        Simulate model
      </span>

      <div className="flex h-12 w-12 items-center justify-center border border-gray-300">
        <SimulateIcon iconColor="#003a8c" className="h-auto w-4" />
      </div>
    </button>
  );
}
