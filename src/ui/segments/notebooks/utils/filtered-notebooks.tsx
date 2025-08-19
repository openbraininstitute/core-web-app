import { Notebook } from '@/util/virtual-lab/types';
import { useMemo } from 'react';

type StringKeys = {
  [K in keyof Notebook]: Notebook[K] extends string ? K : never;
}[keyof Notebook];

function useFilteredNotebooks(notebooks: any[], search: string) {
  return useMemo(() => {
    if (!search) return notebooks;
    return notebooks.filter((n) => {
      const searchFields: StringKeys[] = [
        'authors',
        'description',
        'notebookUrl',
        'name',
        'objectOfInterest',
        'scale',
      ];

      for (const field of searchFields) {
        if (n[field].toLocaleLowerCase().includes(search.toLocaleLowerCase())) {
          return true;
        }
      }
      return false;
    });
  }, [notebooks, search]);
}

export default useFilteredNotebooks;
