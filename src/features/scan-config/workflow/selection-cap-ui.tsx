import { useCallback } from 'react';

import {
  canSelectWithinCap,
  formatSelectionCap,
  isOverSelectionCap,
} from '@/features/scan-config/workflow/selection-cap';
import { cn } from '@/utils/css-class';

export function useSelectionCap({
  selectedRows,
  selectedCount,
  maxSelections,
}: {
  selectedRows: readonly { id: string }[];
  selectedCount: number;
  maxSelections: number | undefined;
}) {
  const isRowSelectable = useCallback(
    (row: { id: string }) =>
      canSelectWithinCap({
        selected: selectedRows.some((r) => r.id === row.id),
        selectedCount,
        maxSelections,
      }),
    [maxSelections, selectedCount, selectedRows]
  );

  return {
    isRowSelectable,
    confirmDisabled: selectedCount === 0 || isOverSelectionCap(selectedCount, maxSelections),
  };
}

export function SelectionCapHint({
  selectedCount,
  maxSelections,
  className,
  testId,
}: {
  selectedCount: number;
  maxSelections: number;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        'text-sm tabular-nums',
        selectedCount >= maxSelections ? 'font-medium text-amber-600' : 'text-gray-500',
        className
      )}
    >
      {formatSelectionCap(selectedCount, maxSelections)}
    </span>
  );
}
