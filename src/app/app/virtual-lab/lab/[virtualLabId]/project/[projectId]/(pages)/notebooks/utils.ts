import type { Notebook } from '@/util/virtual-lab/types';

export const getSorter = (key: keyof Notebook) => {
  const sorter = (a: Notebook, b: Notebook) => {
    if (!(key in a && typeof a[key] === 'string' && key in b && typeof b[key] === 'string'))
      return 0;
    return a[key].localeCompare(b[key]);
  };

  return sorter;
};
