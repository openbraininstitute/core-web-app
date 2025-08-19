import { useState } from 'react';

export type NotebookColumnKey =
  | 'name'
  | 'description'
  | 'objectOfInterest'
  | 'scale'
  | 'authors'
  | 'creationDate';

export function useToggleColumns(columns: any[]) {
  const [hiddenColumns, setHiddenColumns] = useState<NotebookColumnKey[]>([]);

  function toggleColumn(key: NotebookColumnKey) {
    setHiddenColumns((prev) =>
      prev.includes(key) ? prev.filter((col) => col !== key) : [...prev, key]
    );
  }

  function isColumnHidden(key: NotebookColumnKey) {
    return hiddenColumns.includes(key);
  }

  const filteredColumns = columns.filter((col) => !hiddenColumns.includes(col.key));

  return { filteredColumns, toggleColumn, isColumnHidden };
}
