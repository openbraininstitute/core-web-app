import { useCallback } from 'react';

import { cellAt } from './cell-colors';

import type { Population } from './types';

/** A click on a cell of the scene, by its number: another population picked, or the subject's cell by its index. */
export function useCellClick(
  populations: readonly Population[],
  subjectName: string | undefined,
  onPopulationClick?: (name: string) => void,
  onSubjectCellClick?: (index: number) => void
) {
  return useCallback(
    (cell: number) => {
      const at = cellAt(populations, cell);
      if (!at) return;
      if (at.name !== subjectName) onPopulationClick?.(at.name);
      else onSubjectCellClick?.(at.index);
    },
    [populations, subjectName, onPopulationClick, onSubjectCellClick]
  );
}
