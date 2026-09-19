'use client';

/**
 * Middle-panel renderer for a `block_ordered` root element.
 *
 * SCAFFOLD: for now this only shows which child block is selected. Rendering the selected
 * child's schema (via the generic block/field machinery) is the next step.
 */

import type { IBlockOrdered } from '@/features/scan-config/types';

type Props = {
  schema: IBlockOrdered;
  selectedBlock: string;
};

export function BlockOrdered({ schema, selectedBlock }: Props) {
  const child = selectedBlock ? schema.properties[selectedBlock] : undefined;

  return (
    <div className="flex h-full w-full flex-col gap-2 p-4">
      {selectedBlock ? (
        <>
          <h3 className="text-primary-8 text-lg font-bold">{child?.title ?? selectedBlock}</h3>
          <p className="text-sm text-gray-500">Selected block: {selectedBlock}</p>
        </>
      ) : (
        <p className="text-sm text-gray-400 italic">Select a block from the left.</p>
      )}
    </div>
  );
}
